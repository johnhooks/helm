<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Navigation\NavigationService;
use Helm\ShipLink\Contracts\ActionHandler;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Ship;

/**
 * Resolves route scan actions.
 *
 * Executes the scan using values calculated at creation time.
 * No re-validation - the player committed to this action, it completes.
 */
final class Resolver implements ActionHandler
{
    public function __construct(
        private readonly NavigationService $navigationService,
    ) {
    }

    public function handle(Action $action, Ship $ship): void
    {
        // Read values calculated by Handler
        $result = $action->result ?? [];
        $fromNodeId = $result['from_node_id'] ?? $ship->navigation()->getCurrentPosition();
        $toNodeId = $result['to_node_id'] ?? $action->get('target_node_id');
        $skill = $result['skill'] ?? $ship->navigation()->getSkill();
        $efficiency = $result['efficiency'] ?? $ship->navigation()->getEfficiency();

        // Execute the scan
        $scanResult = $this->navigationService->scan(
            fromNodeId: $fromNodeId,
            toNodeId: $toNodeId,
            skill: $skill,
            efficiency: $efficiency,
        );

        // Update action result with scan outcome
        if ($scanResult->failed) {
            $result['success'] = false;
            $result['edges_discovered'] = 0;
            $result['waypoints_created'] = 0;
        } else {
            $waypointCount = 0;
            foreach ($scanResult->nodes as $node) {
                if ($node->isWaypoint()) {
                    $waypointCount++;
                }
            }

            $result['success'] = true;
            $result['edges_discovered'] = count($scanResult->edges);
            $result['waypoints_created'] = $waypointCount;
        }

        $action->result = $result;
    }
}
