<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\Edge;
use Helm\Navigation\NavigationService;
use Helm\Navigation\Node;
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
        private readonly UserEdgeRepository $userEdgeRepository,
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
            $result['complete'] = false;
            $result['edges_discovered'] = 0;
            $result['waypoints_created'] = 0;
            $result['path'] = [];
            $result['discovered_edge_ids'] = [];
            $result['discovered_node_ids'] = [];
            $result['nodes'] = [];
            $result['edges'] = [];
        } else {
            $userId = $ship->getOwnerId();
            foreach ($scanResult->edges as $edge) {
                $this->userEdgeRepository->upsert($userId, $edge->id);
            }

            $waypointCount = 0;
            foreach ($scanResult->nodes as $node) {
                if ($node->isWaypoint()) {
                    $waypointCount++;
                }
            }

            $result['success'] = true;
            $result['complete'] = $scanResult->complete;
            $result['edges_discovered'] = count($scanResult->edges);
            $result['waypoints_created'] = $waypointCount;
            $result['path'] = $scanResult->pathIds();
            $result['discovered_edge_ids'] = array_map(
                static fn(Edge $e) => $e->id,
                $scanResult->edges
            );
            $result['discovered_node_ids'] = array_map(
                static fn(Node $n) => $n->id,
                $scanResult->nodes
            );
            $result['nodes'] = array_map(static fn(Node $n) => [
                'id' => $n->id,
                'type' => $n->isSystem() ? 'system' : 'waypoint',
                'x' => $n->x,
                'y' => $n->y,
                'z' => $n->z,
            ], $scanResult->nodes);
            $result['edges'] = array_map(static fn(Edge $e) => [
                'id' => $e->id,
                'node_a_id' => $e->nodeAId,
                'node_b_id' => $e->nodeBId,
            ], $scanResult->edges);
        }

        $action->result = $result;
    }
}
