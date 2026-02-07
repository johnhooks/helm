<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * A point in the navigation graph.
 *
 * Nodes can be either:
 * - System nodes (type = System) - Created from star catalog data
 * - Waypoints (type = Waypoint) - Algorithmically generated navigation points
 */
final class Node
{
    public function __construct(
        public readonly int $id,
        public readonly float $x,
        public readonly float $y,
        public readonly float $z,
        public readonly NodeType $type = NodeType::Waypoint,
        public readonly ?string $hash = null,
        public readonly int $algorithmVersion = 1,
        public readonly ?string $createdAt = null,
    ) {
    }

    /**
     * Is this node a star system?
     */
    public function isSystem(): bool
    {
        return $this->type === NodeType::System;
    }

    /**
     * Is this node a waypoint?
     */
    public function isWaypoint(): bool
    {
        return $this->type === NodeType::Waypoint;
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
     *
     * @return array{float, float, float}
     */
    public function coordinates(): array
    {
        return [$this->x, $this->y, $this->z];
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
            x: (float) $row['x'],
            y: (float) $row['y'],
            z: (float) $row['z'],
            type: NodeType::from((int) $row['type']),
            hash: $row['hash'] ?? null,
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
            'type' => $this->type->value,
            'x' => $this->x,
            'y' => $this->y,
            'z' => $this->z,
            'hash' => $this->hash,
            'algorithm_version' => $this->algorithmVersion,
        ];
    }
}
