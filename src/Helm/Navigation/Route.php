<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * A saved path between two stars.
 *
 * Routes store a sequence of node IDs representing a complete path.
 * They track traversal count and can become public after enough use.
 */
final class Route
{
    public const VISIBILITY_PRIVATE = 'private';
    public const VISIBILITY_PUBLIC = 'public';

    public const PUBLIC_THRESHOLD = 5;

    /**
     * @param array<int> $path Node IDs in order
     */
    public function __construct(
        public readonly int $id,
        public readonly int $startNodeId,
        public readonly int $endNodeId,
        public readonly array $path,
        public readonly float $totalDistance,
        public readonly int $jumpCount,
        public readonly string $discoveredByShipId,
        public readonly int $traversalCount = 1,
        public readonly string $visibility = self::VISIBILITY_PRIVATE,
        public readonly ?string $name = null,
        public readonly int $algorithmVersion = 1,
        public readonly ?string $createdAt = null,
    ) {
    }

    /**
     * Is this route publicly visible?
     */
    public function isPublic(): bool
    {
        return $this->visibility === self::VISIBILITY_PUBLIC;
    }

    /**
     * Is this route private?
     */
    public function isPrivate(): bool
    {
        return $this->visibility === self::VISIBILITY_PRIVATE;
    }

    /**
     * Should this route become public based on traversal count?
     */
    public function shouldBecomePublic(): bool
    {
        return $this->isPrivate() && $this->traversalCount >= self::PUBLIC_THRESHOLD;
    }

    /**
     * Get the path as node IDs.
     *
     * @return array<int>
     */
    public function nodeIds(): array
    {
        return $this->path;
    }

    /**
     * Get pairs of consecutive nodes (edges).
     *
     * @return array<array{int, int}>
     */
    public function edgePairs(): array
    {
        $pairs = [];
        for ($i = 0; $i < count($this->path) - 1; $i++) {
            $pairs[] = [$this->path[$i], $this->path[$i + 1]];
        }
        return $pairs;
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

        $path = $row['path'];
        if (is_string($path)) {
            $path = json_decode($path, true);
        }

        return new self(
            id: (int) $row['id'],
            startNodeId: (int) $row['start_node_id'],
            endNodeId: (int) $row['end_node_id'],
            path: $path,
            totalDistance: (float) $row['total_distance'],
            jumpCount: (int) $row['jump_count'],
            discoveredByShipId: $row['discovered_by_ship_id'],
            traversalCount: (int) ($row['traversal_count'] ?? 1),
            visibility: $row['visibility'] ?? self::VISIBILITY_PRIVATE,
            name: $row['name'] ?? null,
            algorithmVersion: (int) ($row['algorithm_version'] ?? 1),
            createdAt: $row['created_at'] ?? null,
        );
    }

    /**
     * Convert to array for database insertion.
     *
     * @return array<string, mixed>
     */
    public function toRow(): array
    {
        return [
            'name' => $this->name,
            'start_node_id' => $this->startNodeId,
            'end_node_id' => $this->endNodeId,
            'path' => json_encode($this->path),
            'total_distance' => $this->totalDistance,
            'jump_count' => $this->jumpCount,
            'discovered_by_ship_id' => $this->discoveredByShipId,
            'traversal_count' => $this->traversalCount,
            'visibility' => $this->visibility,
            'algorithm_version' => $this->algorithmVersion,
        ];
    }

    /**
     * Create a new route from a completed path.
     *
     * @param array<int> $path Node IDs in order
     */
    public static function create(
        array $path,
        float $totalDistance,
        string $discoveredByShipId,
        ?string $name = null,
        int $algorithmVersion = 1,
    ): self {
        if (count($path) < 2) {
            throw new \InvalidArgumentException('Route path must have at least 2 nodes');
        }

        return new self(
            id: 0, // Will be set on insert
            startNodeId: $path[0],
            endNodeId: $path[count($path) - 1],
            path: $path,
            totalDistance: $totalDistance,
            jumpCount: count($path) - 1,
            discoveredByShipId: $discoveredByShipId,
            traversalCount: 1,
            visibility: self::VISIBILITY_PRIVATE,
            name: $name,
            algorithmVersion: $algorithmVersion,
        );
    }
}
