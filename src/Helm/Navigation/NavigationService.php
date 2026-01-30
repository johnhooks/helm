<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Core\ErrorCode;

/**
 * Graph operations for navigation.
 *
 * Pure infrastructure - no knowledge of ships, power, or core life.
 * Takes primitives, returns results.
 */
final class NavigationService
{
    public function __construct(
        private readonly NavComputer $navComputer,
        private readonly NodeRepository $nodeRepository,
        private readonly EdgeRepository $edgeRepository,
        private readonly RouteRepository $routeRepository,
    ) {
    }

    /**
     * Get edge information between two nodes.
     *
     * Validates that both nodes exist and are connected.
     *
     * @param int $fromNodeId Starting node
     * @param int $toNodeId Target node
     * @return EdgeInfo|\WP_Error Edge info on success, error if invalid
     */
    public function getEdgeInfo(int $fromNodeId, int $toNodeId): EdgeInfo|\WP_Error
    {
        $fromNode = $this->nodeRepository->get($fromNodeId);
        if ($fromNode === null) {
            return ErrorCode::NavigationInvalidNode->error(
                __('Current position is not a valid node', 'helm')
            );
        }

        $toNode = $this->nodeRepository->get($toNodeId);
        if ($toNode === null) {
            return ErrorCode::NavigationInvalidTarget->error(
                __('Target node does not exist', 'helm')
            );
        }

        $edge = $this->edgeRepository->getBetween($fromNodeId, $toNodeId);
        if ($edge === null) {
            return ErrorCode::NavigationNoRoute->error(
                __('No known route to target', 'helm')
            );
        }

        return EdgeInfo::fromEdge($edge, $fromNodeId, $toNode);
    }

    /**
     * Scan for routes toward a destination.
     *
     * Uses nav computer to discover waypoints based on skill and efficiency.
     *
     * @param int $fromNodeId Starting node
     * @param int $toNodeId Target node
     * @param float $skill Navigation skill (0.0 - 1.0)
     * @param float $efficiency Navigation efficiency (0.0 - 1.0)
     * @return ScanResult Discovered nodes and edges
     */
    public function scan(
        int $fromNodeId,
        int $toNodeId,
        float $skill,
        float $efficiency,
    ): ScanResult {
        $fromNode = $this->nodeRepository->get($fromNodeId);
        $toNode = $this->nodeRepository->get($toNodeId);

        if ($fromNode === null || $toNode === null) {
            return ScanResult::failure();
        }

        $input = new ScanInput(
            from: $fromNode,
            to: $toNode,
            chance: 1.0,
            skill: $skill,
            efficiency: $efficiency,
        );

        return $this->navComputer->scan($input);
    }

    /**
     * Get all nodes connected to a given node.
     *
     * Returns nodes that have known edges, regardless of distance.
     *
     * @param int $nodeId The node to query from
     * @return array<array{node: Node, distance: float}> Connected nodes with distances
     */
    public function getConnectedNodes(int $nodeId): array
    {
        $edges = $this->edgeRepository->fromNode($nodeId);
        $connected = [];

        foreach ($edges as $edge) {
            $otherNodeId = $edge->nodeAId === $nodeId
                ? $edge->nodeBId
                : $edge->nodeAId;

            $node = $this->nodeRepository->get($otherNodeId);
            if ($node !== null) {
                $connected[] = [
                    'node' => $node,
                    'distance' => $edge->distance,
                ];
            }
        }

        return $connected;
    }

    /**
     * Get a node by ID.
     */
    public function getNode(int $nodeId): ?Node
    {
        return $this->nodeRepository->get($nodeId);
    }

    /**
     * Save a completed route.
     *
     * @param string $discoveredBy Identifier of who discovered the route
     * @param int[] $path Node IDs traversed
     * @param float $totalDistance Total distance traveled
     */
    public function saveRoute(
        string $discoveredBy,
        array $path,
        float $totalDistance,
    ): Route {
        $route = Route::create(
            path: $path,
            totalDistance: $totalDistance,
            discoveredByShipId: $discoveredBy,
            algorithmVersion: NodeGenerator::ALGORITHM_VERSION,
        );

        return $this->routeRepository->save($route);
    }

    /**
     * Calculate straight-line distance between two nodes.
     */
    public function calculateDistance(int $fromNodeId, int $toNodeId): ?float
    {
        $fromNode = $this->nodeRepository->get($fromNodeId);
        $toNode = $this->nodeRepository->get($toNodeId);

        if ($fromNode === null || $toNode === null) {
            return null;
        }

        return sqrt(
            pow($toNode->x - $fromNode->x, 2) +
            pow($toNode->y - $fromNode->y, 2) +
            pow($toNode->z - $fromNode->z, 2)
        );
    }
}
