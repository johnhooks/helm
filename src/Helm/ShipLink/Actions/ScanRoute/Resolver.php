<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Core\ErrorCode;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Resolves route scan actions one cycle at a time.
 *
 * Private progress lives in the action's runtime state. Each cycle is
 * resolved against live ship stats when its checkpoint is processed.
 * Discoveries accumulate publicly while continuation bookkeeping stays private.
 */
final class Resolver implements ActionHandler
{
    public function __construct(
        private readonly NavigationService $navigationService,
        private readonly UserEdgeRepository $userEdgeRepository,
    ) {
    }

    public function handle(Action $action, Ship $ship): void
    {
        if ($action->status->isFinalState()) {
            return;
        }

        $params = Params::fromArray($action->params);
        $fromNodeId = $params->fromNodeId;
        $targetNodeId = $params->targetNodeId;
        $currentNodeId = $ship->navigation()->getCurrentPosition();

        if (
            $fromNodeId === null
            || $targetNodeId === null
            || $action->runtime_state === null
            || $currentNodeId !== $fromNodeId
        ) {
            $action->fail(ErrorCode::ActionFailed->error(
                __('Route scan no longer matches ship state', 'helm')
            ));
            return;
        }

        $state = RuntimeState::fromArray($action->runtime_state);

        if ($state->hasExceededMaxCycles()) {
            $this->finishIncomplete($action, $fromNodeId);
            return;
        }

        $scanSource = $state->currentNodeId ?? $fromNodeId;

        // Live stats each cycle: mid-scan changes affect remaining cycles
        $skill = $ship->navigation()->getSkill();
        $efficiency = $ship->navigation()->getEfficiency();

        $scanPhase = $this->navigationService->scanNextHop(
            fromNodeId: $scanSource,
            toNodeId: $targetNodeId,
            skill: $skill,
            efficiency: $efficiency,
            rollFirstHop: $state->depth === 0,
        );

        $record = [
            'cycle_index' => $state->cycleIndex,
            'resolved_at' => Date::nowString(),
            'from_node_id' => $scanSource,
            'target_node_id' => $targetNodeId,
            'skill' => $skill,
            'efficiency' => $efficiency,
        ];

        if ($scanPhase->failed || $scanPhase->edge === null || $scanPhase->node === null) {
            $record['outcome'] = 'no_discovery';
            $this->continueScan($action, $state->withRecordedCycle($record), $fromNodeId);
            return;
        }

        $this->userEdgeRepository->upsert($ship->getOwnerId(), $scanPhase->edge->id);

        $result = $action->result === null ? new Result(path: [$fromNodeId]) : Result::fromArray($action->result);
        $revisited = in_array($scanPhase->node->id, $result->path, true);
        $result->path[] = $scanPhase->node->id;
        $result->phases[] = [
            'from_node_id' => $scanSource,
            'target_node_id' => $targetNodeId,
            'discovered_node_id' => $scanPhase->node->id,
            'discovered_edge_id' => $scanPhase->edge->id,
        ];
        $result->discoveredEdgeIds = array_values(array_unique([
            ...$result->discoveredEdgeIds, $scanPhase->edge->id,
        ]));
        $result->discoveredNodeIds = array_values(array_unique([
            ...$result->discoveredNodeIds, $scanPhase->node->id,
        ]));
        $action->result = $result->toArray();
        $record['discovered_node_id'] = $scanPhase->node->id;
        $record['discovered_edge_id'] = $scanPhase->edge->id;

        if ($scanPhase->complete) {
            $record['outcome'] = 'target_reached';
            $action->runtime_state = $state->withDiscovery($scanPhase->node->id)->withRecordedCycle($record)->toArray();
            $action->fulfill();
            return;
        }

        if ($revisited) {
            $record['outcome'] = 'revisited_node';
            $action->runtime_state = $state->withRecordedCycle($record)->toArray();
            $this->finishIncomplete($action, $fromNodeId);
            return;
        }

        $state = $state->withDiscovery($scanPhase->node->id);
        $continuation = $this->navigationService->rollScanContinuation(
            fromNodeId: $scanPhase->node->id,
            toNodeId: $targetNodeId,
            skill: $skill,
            efficiency: $efficiency,
            hopIndex: $state->depth,
        );
        $record['outcome'] = 'waypoint';
        $record['continuation'] = $continuation;
        $state = $state->withRecordedCycle($record);
        $action->runtime_state = $state->toArray();

        if (! $continuation['continues']) {
            $this->finishIncomplete($action, $fromNodeId);
            return;
        }

        $this->continueScan($action, $state, $fromNodeId);
    }

    private function continueScan(Action $action, RuntimeState $state, int $origin): void
    {
        $action->runtime_state = $state->toArray();
        $next = $state->nextCycle();
        if ($next->hasExceededMaxCycles()) {
            $this->finishIncomplete($action, $origin);
            return;
        }

        $action->runtime_state = $next->toArray();
        $action->status = ActionStatus::Running;
        $action->deferred_until = $next->checkpointAt();
    }

    private function finishIncomplete(Action $action, int $origin): void
    {
        $result = $action->result === null ? new Result(path: [$origin]) : Result::fromArray($action->result);
        if ($result->discoveredEdgeIds !== []) {
            $action->partial($result->toArray());
        } else {
            $action->fulfill($result->toArray());
        }
    }
}
