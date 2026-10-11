<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Core\ErrorCode;
use Psr\Log\LoggerInterface;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\RandomSource;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

final class Resolver implements ActionHandler
{
    public function __construct(
        private readonly Rules $rules,
        private readonly RandomSource $random,
        private readonly NavigationService $navigation,
        private readonly UserEdgeRepository $edges,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function handle(Action $action, Ship $ship): void
    {
        if ($action->status->isFinalState() || $action->deferred_until === null || $action->deferred_until > Date::now()) {
            return;
        }
        $params = Params::fromArray($action->params);
        if (
            $action->runtime_state === null
            || $params->fromNodeId === null
            || $params->fromNodeId !== $ship->navigation()->getCurrentPosition()
            || $params->targetNodeId === null
        ) {
            $this->logger->warning('Scan {action_id} no longer matches its ship', [
                'event' => 'scan.invalid_state',
                'action_id' => $action->id,
                'ship_id' => $ship->getId(),
            ]);
            $action->fail(ErrorCode::ShipNoPosition->error(__('Scan no longer matches the ship position.', 'helm')));
            return;
        }
        $state = RuntimeState::fromArray($action->runtime_state);
        $context = [
            'action_id' => $action->id,
            'ship_id' => $ship->getId(),
        ];
        $reason = $this->rules->stopReason($state, $ship->power()->getCoreLife());
        if ($reason !== null) {
            $this->finish($action, $state, $reason);
            return;
        }

        // Charge this cycle, then attempt useful work.
        $chance = $this->rules->nextChance($state);
        $cost = $state->coreCost;
        $core = $ship->getLoadout()->core()->component();
        $core->life = ($core->life ?? 0) - $cost;
        $state->spent += $cost;
        $state->completed++;
        $workRoll = $this->random->next();
        if ($workRoll < $state->workChance) {
            $state->work += $state->workGain;
        }

        // Accumulated work determines the chance of discovering the next connection.
        $discovered = null;
        $reached = false;
        $revisited = false;
        $workAfter = $state->work;
        $discoveryChance = $this->rules->chanceAt($state, $state->work);
        $discoveryRoll = $this->random->next();
        if ($discoveryRoll < $discoveryChance) {
            $phase = $this->navigation->scanNextHop(
                fromNodeId: $state->source,
                toNodeId: $params->targetNodeId,
                skill: $state->skill,
                efficiency: 1.0,
                rollFirstHop: false,
            );
            if ($phase->node === null || $phase->edge === null) {
                $action->fail(ErrorCode::NavigationInvalidTarget->error(__('Scan destination is no longer available.', 'helm')));
                $action->runtime_state = $state->toArray();
                return;
            }
            $this->edges->upsert($ship->getOwnerId(), $phase->edge->id);
            $result = Result::fromArray($action->result ?? []);
            $revisited = in_array($phase->node->id, $result->path, true);
            $result->path[] = $phase->node->id;
            $result->phases[] = [
                'from_node_id' => $state->source,
                'target_node_id' => $params->targetNodeId,
                'discovered_node_id' => $phase->node->id,
                'discovered_edge_id' => $phase->edge->id,
            ];
            $result->discoveredEdgeIds = array_values(array_unique([...$result->discoveredEdgeIds, $phase->edge->id]));
            $result->discoveredNodeIds = array_values(array_unique([...$result->discoveredNodeIds, $phase->node->id]));
            $action->result = $result->toArray();
            $state->source = $phase->node->id;
            $state->depth++;
            $state->work = 0;
            $discovered = $phase->node->id;
            $reached = $phase->complete;
            $this->logger->info('Scan {action_id} discovered node {node_id} through edge {edge_id}', $context + [
                'event' => 'scan.discovery',
                'cycle' => $state->completed,
                'node_id' => $phase->node->id,
                'edge_id' => $phase->edge->id,
            ]);
        }

        $this->logger->debug('Scan {action_id} processed cycle {cycle}', $context + [
            'event' => 'scan.cycle_processed',
            'cycle' => $state->completed,
            'checkpoint_at' => $action->deferred_until->format('c'),
            'work_after' => $workAfter,
            'discovery_chance' => $chance,
            'discovered_node_id' => $discovered,
            'cumulative_cost' => ['core_life' => $state->spent],
        ]);

        if ($reached) {
            $action->fulfill();
            $action->runtime_state = $state->toArray();
            return;
        }
        if ($revisited) {
            $this->finish($action, $state, StopReason::Revisited);
            return;
        }

        if (!$this->rules->prepareConnection($state, $params)) {
            $action->fail(ErrorCode::NavigationInvalidTarget->error(__('Scan destination is no longer available.', 'helm')));
            $action->runtime_state = $state->toArray();
            return;
        }
        $reason = $this->rules->stopReason($state, $ship->power()->getCoreLife());
        if ($reason !== null) {
            $this->finish($action, $state, $reason);
            return;
        }
        $action->status = ActionStatus::Running;
        $action->deferred_until = Date::addSeconds(
            Date::fromString($state->startedAt),
            ($state->completed + 1) * $state->cycleSeconds,
        );
        $action->runtime_state = $state->toArray();
        $this->logger->debug('Scan {action_id} scheduled its next checkpoint', $context + [
            'event' => 'scan.scheduled',
            'cycle' => $state->completed + 1,
            'checkpoint_at' => $action->deferred_until->format('c'),
        ]);
    }

    private function finish(Action $action, RuntimeState $state, StopReason $reason): void
    {
        $this->logger->warning('Scan {action_id} stopped: {reason}', [
            'event' => 'scan.stopped',
            'action_id' => $action->id,
            'ship_id' => $action->ship_post_id,
            'cycle' => $state->completed,
            'reason' => $reason->value,
            'core_spent' => $state->spent,
        ]);
        $action->result = [...($action->result ?? []), 'stop_reason' => $reason->value];
        if (($action->result['discovered_edge_ids'] ?? []) !== []) {
            $action->partial($action->result ?? []);
        } else {
            // A completed attempt with no discoveries is not a technical failure.
            $action->fulfill();
        }
        $action->runtime_state = $state->toArray();
    }
}
