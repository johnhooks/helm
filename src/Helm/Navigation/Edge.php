<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * A bidirectional connection between two nodes.
 *
 * Edges are always stored with node_a_id < node_b_id to ensure uniqueness.
 * Traversal count tracks how often this edge has been used.
 */
final class Edge
{
    public const PUBLIC_THRESHOLD = 10;

    public function __construct(
        public readonly int $id,
        public readonly int $nodeAId,
        public readonly int $nodeBId,
        public readonly float $distance,
        public readonly ?string $discoveredByShipId = null,
        public readonly int $traversalCount = 0,
        public readonly int $algorithmVersion = 1,
        public readonly ?string $createdAt = null,
    ) {
    }

    /**
     * Is this edge well-traveled enough to be publicly visible?
     */
    public function isPublic(): bool
    {
        return $this->traversalCount >= self::PUBLIC_THRESHOLD;
    }

    /**
     * Get the other node ID given one end of the edge.
     */
    public function otherNode(int $nodeId): int
    {
        if ($nodeId === $this->nodeAId) {
            return $this->nodeBId;
        }

        if ($nodeId === $this->nodeBId) {
            return $this->nodeAId;
        }

        throw new \InvalidArgumentException("Node {$nodeId} is not part of this edge");
    }

    /**
     * Check if this edge connects a specific node.
     */
    public function connectsNode(int $nodeId): bool
    {
        return $this->nodeAId === $nodeId || $this->nodeBId === $nodeId;
    }

    /**
     * Check if this edge connects two specific nodes.
     */
    public function connects(int $nodeA, int $nodeB): bool
    {
        return ($this->nodeAId === $nodeA && $this->nodeBId === $nodeB)
            || ($this->nodeAId === $nodeB && $this->nodeBId === $nodeA);
    }

    /**
     * Create from database row.
     *
     * @param array<string, mixed>|object $row
     */
    public static function fromRow(array|object $row): self
    {
        if (is_object($row)) {
            $row = (array) $row;
        }

        return new self(
            id: (int) $row['id'],
            nodeAId: (int) $row['node_a_id'],
            nodeBId: (int) $row['node_b_id'],
            distance: (float) $row['distance'],
            discoveredByShipId: $row['discovered_by_ship_id'] ?? null,
            traversalCount: (int) ($row['traversal_count'] ?? 0),
            algorithmVersion: (int) ($row['algorithm_version'] ?? 1),
            createdAt: $row['created_at'] ?? null,
        );
    }

    /**
     * Convert to array for database insertion.
     *
     * Ensures node_a_id < node_b_id for consistency.
     *
     * @return array<string, mixed>
     */
    public function toRow(): array
    {
        $nodeA = min($this->nodeAId, $this->nodeBId);
        $nodeB = max($this->nodeAId, $this->nodeBId);

        return [
            'node_a_id' => $nodeA,
            'node_b_id' => $nodeB,
            'distance' => $this->distance,
            'discovered_by_ship_id' => $this->discoveredByShipId,
            'traversal_count' => $this->traversalCount,
            'algorithm_version' => $this->algorithmVersion,
        ];
    }

    /**
     * Create a new edge between two nodes.
     *
     * Automatically orders node IDs correctly.
     */
    public static function create(
        int $nodeA,
        int $nodeB,
        float $distance,
        ?string $discoveredByShipId = null,
        int $algorithmVersion = 1,
    ): self {
        return new self(
            id: 0, // Will be set on insert
            nodeAId: min($nodeA, $nodeB),
            nodeBId: max($nodeA, $nodeB),
            distance: $distance,
            discoveredByShipId: $discoveredByShipId,
            traversalCount: 0,
            algorithmVersion: $algorithmVersion,
        );
    }
}
