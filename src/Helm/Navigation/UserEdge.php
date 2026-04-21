<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * A single edge as discovered by a specific player.
 *
 * Composite of the global edge record (node pair, distance) and the
 * per-user discovery (timestamp). Produced by a join between
 * helm_user_edge and helm_nav_edges, so any UserEdge returned by the
 * repository is guaranteed to reference a live edge row.
 */
final class UserEdge
{
    public function __construct(
        public readonly int $userId,
        public readonly int $edgeId,
        public readonly int $nodeAId,
        public readonly int $nodeBId,
        public readonly float $distance,
        public readonly string $discoveredAt,
    ) {
    }

    /**
     * Create from a joined database row.
     *
     * @param array<string, mixed>|object $row
     */
    public static function fromRow(array|object $row): self
    {
        if (is_object($row)) {
            $row = (array) $row;
        }

        return new self(
            userId: (int) $row['user_id'],
            edgeId: (int) $row['edge_id'],
            nodeAId: (int) $row['node_a_id'],
            nodeBId: (int) $row['node_b_id'],
            distance: (float) $row['distance'],
            discoveredAt: (string) $row['discovered_at'],
        );
    }
}
