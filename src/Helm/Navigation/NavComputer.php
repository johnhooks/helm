<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * Navigation computer - handles scan logic.
 *
 * This is the GAMEPLAY layer. It uses NodeGenerator for deterministic
 * waypoint positions, but adds chance/skill/efficiency mechanics.
 *
 * A high-skill scan might reveal multiple hops at once.
 * A low-skill scan might fail or reveal only one hop.
 */
final class NavComputer
{
    /**
     * Diminishing returns factor for multi-hop discovery.
     * Each hop beyond the first has (skill * efficiency * DECAY^hopIndex) probability.
     */
    private const DISCOVERY_DECAY = 0.85;

    /**
     * Scale factor for distance penalty on first-hop success.
     * Higher = more forgiving at long distances.
     */
    private const DISTANCE_SCALE = 10.0;

    /**
     * Maximum range for jump attempts (light years).
     *
     * 7 ly keeps all 4,060 stars connected while requiring
     * multiple hops for most journeys. 6 ly is the minimum
     * for full connectivity.
     */
    private const MAX_RANGE = 7.0;

    public function __construct(
        private readonly NodeGenerator $generator,
        private readonly NodeRepository $nodeRepository,
        private readonly EdgeRepository $edgeRepository,
    ) {
    }

    /**
     * Perform a navigation scan.
     *
     * Attempts to compute a path from the starting node toward the destination.
     * May discover one or more waypoints depending on skill/efficiency.
     *
     * @param ScanInput $input Scan parameters
     * @return ScanResult The discovered nodes and edges
     */
    public function scan(ScanInput $input): ScanResult
    {
        $from = $input->from;
        $to = $input->to;
        $distance = $input->distance();

        // Check if direct jump is possible (deterministic)
        if ($this->generator->canDirectJump($from, $to, self::MAX_RANGE)) {
            return $this->createDirectResult($from, $to, $distance);
        }

        // Roll for first hop success
        if (!$this->rollFirstHop($input)) {
            return ScanResult::failure();
        }

        // Discover waypoints
        return $this->discoverPath($input);
    }

    /**
     * Roll for first hop success.
     *
     * Uses chance variable modified by distance.
     */
    private function rollFirstHop(ScanInput $input): bool
    {
        // Chance of 1.0 always succeeds
        if ($input->chance >= 1.0) {
            return true;
        }

        $distance = $input->distance();

        // Distance penalty (further = harder)
        $distancePenalty = exp(-$distance / self::DISTANCE_SCALE);

        // Corridor difficulty (deterministic fluctuation per node pair)
        $corridorDifficulty = $this->generator->corridorDifficulty($input->from, $input->to);

        // Effective chance combines base chance, distance, and corridor
        $effectiveChance = $input->chance * $distancePenalty * (1.0 - $corridorDifficulty * 0.3);
        $effectiveChance = max(0.01, min(0.99, $effectiveChance));

        // Random roll
        $roll = $this->random();

        return $roll < $effectiveChance;
    }

    /**
     * Discover waypoints along the path.
     *
     * Keeps revealing hops while skill/efficiency rolls succeed.
     */
    private function discoverPath(ScanInput $input): ScanResult
    {
        $discoveredNodes = [];
        $discoveredEdges = [];
        $currentNode = $input->from;
        $targetNode = $input->to;
        $hopIndex = 0;

        while ($currentNode->id !== $targetNode->id) {
            // Check for direct jump from current position
            if ($this->generator->canDirectJump($currentNode, $targetNode, self::MAX_RANGE)) {
                // Create edge directly to destination
                $edge = $this->findOrCreateEdge($currentNode, $targetNode);
                $discoveredNodes[] = $targetNode;
                $discoveredEdges[] = $edge;

                return ScanResult::success($discoveredNodes, $discoveredEdges, complete: true);
            }

            // Generate next waypoint (deterministic)
            $waypointData = $this->generator->computeWaypoint($currentNode, $targetNode);

            // Find or create the waypoint node
            $waypointNode = $this->findOrCreateWaypoint($waypointData);

            // Create edge to waypoint
            $edge = $this->findOrCreateEdge($currentNode, $waypointNode);

            $discoveredNodes[] = $waypointNode;
            $discoveredEdges[] = $edge;
            $currentNode = $waypointNode;
            $hopIndex++;

            // Roll for discovering next hop (skill * efficiency with decay)
            if (!$this->rollBonusHop($input, $hopIndex)) {
                // Stop discovering, but path is partial
                return ScanResult::success($discoveredNodes, $discoveredEdges, complete: false);
            }
        }

        return ScanResult::success($discoveredNodes, $discoveredEdges, complete: true);
    }

    /**
     * Roll for bonus hop discovery.
     *
     * Each successive hop is harder to discover.
     */
    private function rollBonusHop(ScanInput $input, int $hopIndex): bool
    {
        $probability = $input->skill * $input->efficiency * pow(self::DISCOVERY_DECAY, $hopIndex);

        // Minimum 1% chance, maximum 95%
        $probability = max(0.01, min(0.95, $probability));

        return $this->random() < $probability;
    }

    /**
     * Create a direct jump result.
     */
    private function createDirectResult(Node $from, Node $to, float $distance): ScanResult
    {
        $edge = $this->findOrCreateEdge($from, $to);

        return ScanResult::success(
            nodes: [$to],
            edges: [$edge],
            complete: true,
        );
    }

    /**
     * Find existing waypoint by hash or create new one.
     *
     * @param array{x: float, y: float, z: float, hash: string} $data
     */
    private function findOrCreateWaypoint(array $data): Node
    {
        // Check if waypoint already exists
        $existing = $this->nodeRepository->getByHash($data['hash']);
        if ($existing !== null) {
            return $existing;
        }

        // Create new waypoint
        return $this->nodeRepository->create(
            x: $data['x'],
            y: $data['y'],
            z: $data['z'],
            hash: $data['hash'],
            algorithmVersion: NodeGenerator::ALGORITHM_VERSION,
        );
    }

    /**
     * Find existing edge or create new one.
     */
    private function findOrCreateEdge(Node $nodeA, Node $nodeB): Edge
    {
        // Check if edge already exists
        $existing = $this->edgeRepository->getBetween($nodeA->id, $nodeB->id);
        if ($existing !== null) {
            return $existing;
        }

        // Create new edge
        $distance = $nodeA->distanceTo($nodeB);

        return $this->edgeRepository->create(
            nodeA: $nodeA->id,
            nodeB: $nodeB->id,
            distance: $distance,
            algorithmVersion: NodeGenerator::ALGORITHM_VERSION,
        );
    }

    /**
     * Generate a random float 0.0-1.0.
     *
     * Separated for testing (can be mocked).
     */
    protected function random(): float
    {
        return mt_rand() / mt_getrandmax();
    }
}
