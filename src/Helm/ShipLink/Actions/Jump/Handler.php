<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\Jump;

use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Handles jump action creation.
 *
 * Calculates jump parameters and stores them in result for the resolver.
 * This is the commitment point - all data needed to execute is captured here.
 */
final class Handler implements ActionHandler
{
    public function handle(Action $action, Ship $ship): void
    {
        $targetNodeId = $action->get('target_node_id');
        $currentNodeId = $ship->navigation()->getCurrentPosition();

        // Get route info for distance calculation
        $routeInfo = $ship->navigation()->getRouteInfo($targetNodeId);
        $distance = $routeInfo->distance;

        // Calculate costs and duration
        $coreCost = $ship->propulsion()->calculateCoreCost($distance);
        $durationSeconds = $ship->propulsion()->getJumpDuration($distance);
        $completesAt = Date::addSeconds(Date::now(), $durationSeconds);

        // Store calculated values in result - resolver will use these
        $action->result = [
            'from_node_id' => $currentNodeId,
            'to_node_id' => $targetNodeId,
            'distance' => $distance,
            'core_cost' => $coreCost,
            'duration' => $durationSeconds,
        ];

        $action->status = ActionStatus::Pending;
        $action->deferred_until = $completesAt;
    }
}
