<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\Jump;

use Helm\Core\ErrorCode;
use Helm\Lib\Date;
use Helm\Navigation\UserEdge;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Resolves jump actions.
 *
 * Executes jump work and builds action result data as progress happens.
 */
final class Resolver implements ActionHandler
{
    public function handle(Action $action, Ship $ship): void
    {
        $params = Params::fromArray($action->params);
        $fromNodeId = $params->fromNodeId ?? 0;
        $targetNodeId = $params->targetNodeId;
        $route = $params->route;

        if (!is_array($route) || count($route) === 0 || $targetNodeId === null) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('Route plan is invalid', 'helm')
            );
        }

        $edges = $ship->navigation()->getRouteEdges($fromNodeId, $targetNodeId, $route);
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
     * @param list<UserEdge> $route
     */
    private function handleRouteLeg(Action $action, Ship $ship, array $route): void
    {
        $phaseDueAt = $action->deferred_until ?? Date::now();
        $result = Result::fromArray($action->result ?? []);
        $phases = $result->phases ?? [];
        $phaseIndex = count($phases);

        if (!isset($route[$phaseIndex])) {
            $action->fulfill($result->toArray());
            return;
        }

        $leg = $ship->navigation()->getRouteLeg($route, $phaseIndex);
        if (is_wp_error($leg)) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                __('Route can no longer continue', 'helm')
            );
        }

        $coreCost = $ship->propulsion()->calculateCoreCost($leg->distance());
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

        $ship->getState()->node_id = $leg->toNodeId;
        $coreComponent->life = $newCoreLife;

        $phases[] = [
            'core_cost' => $coreCost,
            'core_before' => $currentCoreLife,
            'remaining_core_life' => $newCoreLife,
            'completed_at' => Date::nowString(),
        ];

        $result->phases = $phases;
        $result->currentNodeId = $leg->toNodeId;
        $result->remainingCoreLife = $newCoreLife;
        $result->coreBefore = $currentCoreLife;
        $action->result = $result->toArray();

        if ($leg->nextEdge === null) {
            $action->fulfill();
            return;
        }

        $nextDuration = $ship->propulsion()->getJumpDuration($leg->nextEdge->distance);
        $action->status = ActionStatus::Running;
        $action->deferred_until = Date::addSeconds($phaseDueAt, $nextDuration);
    }
}
