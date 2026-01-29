<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Database\Schema;

/**
 * Repository for navigation edges.
 */
final class EdgeRepository
{
    /**
     * Find an edge by ID.
     */
    public function get(int $id): ?Edge
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE id = %d",
                Schema::table(Schema::TABLE_NAV_EDGES),
                $id
            ),
            ARRAY_A
        );

        return $row ? Edge::fromRow($row) : null;
    }

    /**
     * Find an edge between two nodes.
     */
    public function getBetween(int $nodeA, int $nodeB): ?Edge
    {
        global $wpdb;

        // Always query with lower ID first
        $a = min($nodeA, $nodeB);
        $b = max($nodeA, $nodeB);

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE node_a_id = %d AND node_b_id = %d",
                Schema::table(Schema::TABLE_NAV_EDGES),
                $a,
                $b
            ),
            ARRAY_A
        );

        return $row ? Edge::fromRow($row) : null;
    }

    /**
     * Find all edges from a node.
     *
     * @return Edge[]
     */
    public function fromNode(int $nodeId): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE node_a_id = %d OR node_b_id = %d ORDER BY distance",
                Schema::table(Schema::TABLE_NAV_EDGES),
                $nodeId,
                $nodeId
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Edge::fromRow($row), $rows);
    }

    /**
     * Find all public edges (well-traveled).
     *
     * @return Edge[]
     */
    public function publicEdges(): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE traversal_count >= %d ORDER BY traversal_count DESC",
                Schema::table(Schema::TABLE_NAV_EDGES),
                Edge::PUBLIC_THRESHOLD
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Edge::fromRow($row), $rows);
    }

    /**
     * Find edges discovered by a specific ship.
     *
     * @return Edge[]
     */
    public function discoveredBy(string $shipId): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE discovered_by_ship_id = %s",
                Schema::table(Schema::TABLE_NAV_EDGES),
                $shipId
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Edge::fromRow($row), $rows);
    }

    /**
     * Save an edge (insert or update).
     */
    public function save(Edge $edge): Edge
    {
        global $wpdb;

        $data = $edge->toRow();
        $table = Schema::table(Schema::TABLE_NAV_EDGES);

        if ($edge->id === 0) {
            $wpdb->insert($table, $data);
            $id = (int) $wpdb->insert_id;
        } else {
            $wpdb->update($table, $data, ['id' => $edge->id]);
            $id = $edge->id;
        }

        return $this->get($id);
    }

    /**
     * Create an edge between two nodes.
     */
    public function create(
        int $nodeA,
        int $nodeB,
        float $distance,
        ?string $discoveredByShipId = null,
        int $algorithmVersion = 1,
    ): Edge {
        // Check if edge already exists
        $existing = $this->getBetween($nodeA, $nodeB);
        if ($existing) {
            return $existing;
        }

        $edge = Edge::create(
            nodeA: $nodeA,
            nodeB: $nodeB,
            distance: $distance,
            discoveredByShipId: $discoveredByShipId,
            algorithmVersion: $algorithmVersion,
        );

        return $this->save($edge);
    }

    /**
     * Increment traversal count for an edge.
     */
    public function incrementTraversal(int $edgeId): void
    {
        global $wpdb;

        $wpdb->query(
            $wpdb->prepare(
                "UPDATE %i SET traversal_count = traversal_count + 1 WHERE id = %d",
                Schema::table(Schema::TABLE_NAV_EDGES),
                $edgeId
            )
        );
    }

    /**
     * Increment traversal count for edge between two nodes.
     */
    public function incrementTraversalBetween(int $nodeA, int $nodeB): void
    {
        $edge = $this->getBetween($nodeA, $nodeB);
        if ($edge) {
            $this->incrementTraversal($edge->id);
        }
    }

    /**
     * Delete an edge by ID.
     */
    public function delete(int $id): bool
    {
        global $wpdb;

        $result = $wpdb->delete(
            Schema::table(Schema::TABLE_NAV_EDGES),
            ['id' => $id],
            ['%d']
        );

        return $result !== false;
    }

    /**
     * Delete all edges connected to a node.
     */
    public function deleteForNode(int $nodeId): int
    {
        global $wpdb;

        return (int) $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM %i WHERE node_a_id = %d OR node_b_id = %d",
                Schema::table(Schema::TABLE_NAV_EDGES),
                $nodeId,
                $nodeId
            )
        );
    }

    /**
     * Count all edges.
     */
    public function count(): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i",
                Schema::table(Schema::TABLE_NAV_EDGES)
            )
        );
    }

    /**
     * Check if an edge exists between two nodes.
     */
    public function exists(int $nodeA, int $nodeB): bool
    {
        return $this->getBetween($nodeA, $nodeB) !== null;
    }
}
