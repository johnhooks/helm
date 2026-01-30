<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Core\ErrorCode;
use Helm\Ships\Ship;
use Helm\Ships\ShipRepository;

/**
 * High-level navigation API for ships.
 *
 * Coordinates scanning, jumping, and route management.
 */
final class NavigationService
{
    public function __construct(
        private readonly NavComputer $navComputer,
        private readonly NodeRepository $nodeRepository,
        private readonly EdgeRepository $edgeRepository,
        private readonly RouteRepository $routeRepository,
        private readonly ShipRepository $shipRepository,
    ) {
    }

    /**
     * Scan toward a destination star.
     *
     * Uses ship's navigation skills to discover waypoints.
     *
     * @param Ship $ship The scanning ship
     * @param int $destinationNodeId Target star's node ID
     * @return ScanResult Discovered nodes and edges
     */
    public function scan(Ship $ship, int $destinationNodeId): ScanResult
    {
        $fromNode = $this->nodeRepository->get($ship->nodeId);
        $toNode = $this->nodeRepository->get($destinationNodeId);

        if ($fromNode === null || $toNode === null) {
            return ScanResult::failure();
        }

        $input = new ScanInput(
            from: $fromNode,
            to: $toNode,
            chance: 1.0, // Base chance, could be modified by equipment
            skill: $ship->navSkill,
            efficiency: $ship->navEfficiency,
        );

        return $this->navComputer->scan($input);
    }

    /**
     * Execute a jump to an adjacent node.
     *
     * @param Ship $ship The jumping ship
     * @param int $targetNodeId Node to jump to
     * @return JumpResult|\WP_Error Result on success, WP_Error on failure
     */
    public function jump(Ship $ship, int $targetNodeId): JumpResult|\WP_Error
    {
        // Verify ship is at a node
        $currentNode = $this->nodeRepository->get($ship->nodeId);
        if ($currentNode === null) {
            return ErrorCode::NavigationInvalidNode->error(__('Ship is not at a valid node', 'helm'));
        }

        // Verify target exists
        $targetNode = $this->nodeRepository->get($targetNodeId);
        if ($targetNode === null) {
            return ErrorCode::NavigationInvalidTarget->error(__('Target node does not exist', 'helm'));
        }

        // Verify edge exists (nodes are connected)
        $edge = $this->edgeRepository->getBetween($ship->nodeId, $targetNodeId);
        if ($edge === null) {
            return ErrorCode::NavigationNoRoute->error(__('No known route to target', 'helm'));
        }

        // Check distance against drive range
        if ($edge->distance > $ship->driveRange) {
            return ErrorCode::NavigationBeyondRange->error(__('Target is beyond drive range', 'helm'), [
                'distance' => $edge->distance,
                'driveRange' => $ship->driveRange,
            ]);
        }

        // Calculate fuel cost
        $fuelCost = $this->calculateFuelCost($edge->distance, $ship->driveRange);

        // Check fuel
        if ($ship->fuel < $fuelCost) {
            return ErrorCode::NavigationInsufficientFuel->error(__('Insufficient fuel', 'helm'), [
                'required' => $fuelCost,
                'available' => $ship->fuel,
            ]);
        }

        // Execute jump
        $updatedShip = $ship
            ->withNodeId($targetNodeId)
            ->withFuel($ship->fuel - $fuelCost);

        // Update location if target is a star
        if ($targetNode->starPostId !== null) {
            $updatedShip = $updatedShip->withLocation($this->getStarIdForNode($targetNode));
        }

        $this->shipRepository->save($updatedShip);

        return new JumpResult(
            ship: $updatedShip,
            fuelUsed: $fuelCost,
            distance: $edge->distance,
        );
    }

    /**
     * Get nodes reachable from ship's current position.
     *
     * Returns nodes connected by known edges within drive range.
     *
     * @return Node[]
     */
    public function getReachableNodes(Ship $ship): array
    {
        $edges = $this->edgeRepository->fromNode($ship->nodeId);
        $reachable = [];

        foreach ($edges as $edge) {
            // Skip if beyond drive range
            if ($edge->distance > $ship->driveRange) {
                continue;
            }

            // Get the other node
            $otherNodeId = $edge->nodeAId === $ship->nodeId
                ? $edge->nodeBId
                : $edge->nodeAId;

            $node = $this->nodeRepository->get($otherNodeId);
            if ($node !== null) {
                $reachable[] = $node;
            }
        }

        return $reachable;
    }

    /**
     * Get nodes reachable with current fuel.
     *
     * @return Node[]
     */
    public function getReachableWithFuel(Ship $ship): array
    {
        $edges = $this->edgeRepository->fromNode($ship->nodeId);
        $reachable = [];

        foreach ($edges as $edge) {
            $fuelCost = $this->calculateFuelCost($edge->distance, $ship->driveRange);

            // Skip if not enough fuel
            if ($ship->fuel < $fuelCost) {
                continue;
            }

            // Skip if beyond drive range
            if ($edge->distance > $ship->driveRange) {
                continue;
            }

            $otherNodeId = $edge->nodeAId === $ship->nodeId
                ? $edge->nodeBId
                : $edge->nodeAId;

            $node = $this->nodeRepository->get($otherNodeId);
            if ($node !== null) {
                $reachable[] = $node;
            }
        }

        return $reachable;
    }

    /**
     * Save a completed route.
     *
     * Call this when a ship reaches its destination to record the path.
     *
     * @param Ship $ship The ship that completed the route
     * @param int[] $path Node IDs traversed
     * @param float $totalDistance Total distance traveled
     */
    public function saveRoute(Ship $ship, array $path, float $totalDistance): Route
    {
        $route = Route::create(
            path: $path,
            totalDistance: $totalDistance,
            discoveredByShipId: $ship->id,
            algorithmVersion: NodeGenerator::ALGORITHM_VERSION,
        );

        return $this->routeRepository->save($route);
    }

    /**
     * Calculate fuel cost for a jump.
     *
     * Fuel cost is based on distance relative to drive range.
     * A ship with longer range is more efficient.
     */
    public function calculateFuelCost(float $distance, float $driveRange): float
    {
        // Base cost: 10 fuel per light year
        // Efficiency bonus: better drives use less fuel
        $baseCost = $distance * 10.0;
        $efficiencyFactor = $distance / $driveRange;

        return $baseCost * $efficiencyFactor;
    }

    /**
     * Get star catalog ID for a node.
     */
    private function getStarIdForNode(Node $node): string
    {
        if ($node->starPostId === null) {
            return '';
        }

        $starId = get_post_meta($node->starPostId, '_helm_star_id', true);
        return is_string($starId) ? $starId : '';
    }
}
