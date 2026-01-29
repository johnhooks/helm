<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * A point in the navigation graph.
 *
 * Nodes can be either:
 * - Star nodes (star_post_id is set) - Entry/exit points for star systems
 * - Waypoints (star_post_id is null) - Intermediate navigation points
 */
final class Node
{
    public function __construct(
        public readonly int $id,
        public readonly float $x,
        public readonly float $y,
        public readonly float $z,
        public readonly ?int $starPostId = null,
        public readonly ?string $hash = null,
        public readonly int $algorithmVersion = 1,
        public readonly ?string $createdAt = null,
    ) {}

    /**
     * Is this node a star (has a star system)?
     */
    public function isStar(): bool
    {
        return $this->starPostId !== null;
    }

    /**
     * Is this node a waypoint (no star system)?
     */
    public function isWaypoint(): bool
    {
        return $this->starPostId === null;
    }

    /**
     * Calculate distance to another node.
     */
    public function distanceTo(Node $other): float
    {
        return sqrt(
            ($this->x - $other->x) ** 2 +
            ($this->y - $other->y) ** 2 +
            ($this->z - $other->z) ** 2
        );
    }

    /**
     * Get coordinates as array.
     */
    public function coordinates(): array
    {
        return [$this->x, $this->y, $this->z];
    }

    /**
     * Create from database row.
     */
    public static function fromRow(array|object $row): self
    {
        if (is_object($row)) {
            $row = (array) $row;
        }

        return new self(
            id: (int) $row['id'],
            x: (float) $row['x'],
            y: (float) $row['y'],
            z: (float) $row['z'],
            starPostId: $row['star_post_id'] !== null ? (int) $row['star_post_id'] : null,
            hash: $row['hash'] ?? null,
            algorithmVersion: (int) ($row['algorithm_version'] ?? 1),
            createdAt: $row['created_at'] ?? null,
        );
    }

    /**
     * Convert to array for database insertion.
     */
    public function toRow(): array
    {
        return [
            'star_post_id' => $this->starPostId,
            'x' => $this->x,
            'y' => $this->y,
            'z' => $this->z,
            'hash' => $this->hash,
            'algorithm_version' => $this->algorithmVersion,
        ];
    }
}
