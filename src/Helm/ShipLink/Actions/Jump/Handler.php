<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\Jump;

use Helm\Lib\Date;
use Helm\Core\ErrorCode;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Handles jump action creation.
 *
 * Calculates the first wait window for jump actions.
 *
 */
final class Handler implements ActionHandler
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

        $edges = $ship->navigation()->getRouteEdges($fromNodeId, (int) $targetNodeId, $this->routeEdgeIds($route));
        if (is_wp_error($edges) || $edges === []) {
            throw new ActionException(
                ErrorCode::NavigationNoRoute,
                is_wp_error($edges) ? $edges->get_error_message() : __('Route plan is invalid', 'helm')
            );
        }

        $durationSeconds = $ship->propulsion()->getJumpDuration($edges[0]->distance);
        $completesAt = Date::addSeconds(Date::now(), $durationSeconds);

        $action->status = ActionStatus::Pending;
        $action->deferred_until = $completesAt;
    }

    /**
     * @param array<mixed> $route
     * @return int[]
     */
    private function routeEdgeIds(array $route): array
    {
        return array_map('intval', $route);
    }
}
