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
}
