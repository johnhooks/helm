<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\Jump;

use Helm\Core\ErrorCode;
use Helm\Lib\Date;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Resolves jump actions.
 *
 * Executes jump work and builds action result data as progress happens.
 *
 * @phpstan-type JumpRoutePhase array{core_cost: float, core_before: int, remaining_core_life: int, completed_at: string}
 */
final class Resolver implements ActionHandler
{
    public function handle(Action $action, Ship $ship): void
    {
        $fromNodeId = (int) $action->get('from_node_id');
        $targetNodeId = $action->get('target_node_id');
        $route = $action->get('route');

        if (!is_array($route) || count($route) === 0 || $targetNodeId === null) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('Route plan is invalid', 'helm')
            );
        }

        $edges = $ship->navigation()->getRouteEdges($fromNodeId, (int) $targetNodeId, array_map('intval', $route));
        if (is_wp_error($edges)) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('Route can no longer continue', 'helm')
            );
        }

        $this->handleRouteLeg($action, $ship, $edges);
    }

    /**
     * Resolve one leg of a route-aware jump.
     *
     * @param list<\Helm\Navigation\UserEdge> $route
     */
    private function handleRouteLeg(Action $action, Ship $ship, array $route): void
    {
        $phaseDueAt = $action->deferred_until ?? Date::now();
        $result = $action->result ?? [];
        /** @var array<int, JumpRoutePhase> $phases */
        $phases = isset($result['phases']) && is_array($result['phases'])
            ? array_values($result['phases'])
            : [];
        $phaseIndex = count($phases);

        if (!isset($route[$phaseIndex])) {
            $action->fulfill($result);
            return;
        }

        $edge = $route[$phaseIndex];
        $currentNodeId = $ship->navigation()->getCurrentPosition();

        if ($currentNodeId === $edge->nodeAId) {
            $toNodeId = $edge->nodeBId;
        } elseif ($currentNodeId === $edge->nodeBId) {
            $toNodeId = $edge->nodeAId;
        } else {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('Route can no longer continue', 'helm')
            );
        }

        $distance = $edge->distance;
        $coreCost = $ship->propulsion()->calculateCoreCost($distance);
        $coreComponent = $ship->getLoadout()->core()->component();
        $currentCoreLife = $coreComponent->life ?? 0;

        if ($coreCost > $currentCoreLife) {
            throw new ActionException(
                ErrorCode::ShipInsufficientCore,
                sprintf(
                    /* translators: %1$.1f: required core life, %2$.1f: available core life */
                    __('Core life too low for this jump (need %1$.1f, have %2$.1f)', 'helm'),
                    $coreCost,
                    $currentCoreLife
                )
            );
        }

        $newCoreLife = max(0, $currentCoreLife - (int) ceil($coreCost));

        $ship->getState()->node_id = $toNodeId;
        $coreComponent->life = $newCoreLife;

        $phases[] = [
            'core_cost' => $coreCost,
            'core_before' => $currentCoreLife,
            'remaining_core_life' => $newCoreLife,
            'completed_at' => Date::nowString(),
        ];

        $result['phases'] = $phases;
        $result['current_node_id'] = $toNodeId;
        $result['remaining_core_life'] = $newCoreLife;
        $result['core_before'] = $currentCoreLife;
        $action->result = $result;

        $nextEdge = $route[$phaseIndex + 1] ?? null;
        if ($nextEdge === null) {
            $action->fulfill();
            return;
        }

        if ($nextEdge->nodeAId !== $toNodeId && $nextEdge->nodeBId !== $toNodeId) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('Route can no longer continue', 'helm')
            );
        }

        $nextDuration = $ship->propulsion()->getJumpDuration($nextEdge->distance);
        $action->status = ActionStatus::Running;
        $action->deferred_until = Date::addSeconds($phaseDueAt, $nextDuration);
    }
}
