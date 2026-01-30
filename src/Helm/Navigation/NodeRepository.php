<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Database\Schema;

/**
 * Repository for navigation nodes.
 */
final class NodeRepository
{
    /**
     * Find a node by ID.
     */
    public function get(int $id): ?Node
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE id = %d",
                Schema::table(Schema::TABLE_NAV_NODES),
                $id
            ),
            ARRAY_A
        );

        return $row ? Node::fromRow($row) : null;
    }

    /**
     * Find a node by star post ID.
     */
    public function getByStarPostId(int $starPostId): ?Node
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE star_post_id = %d",
                Schema::table(Schema::TABLE_NAV_NODES),
                $starPostId
            ),
            ARRAY_A
        );

        return $row ? Node::fromRow($row) : null;
    }

    /**
     * Find a waypoint by hash.
     */
    public function getByHash(string $hash): ?Node
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE hash = %s",
                Schema::table(Schema::TABLE_NAV_NODES),
                $hash
            ),
            ARRAY_A
        );

        return $row ? Node::fromRow($row) : null;
    }

    /**
     * Find all star nodes.
     *
     * @return Node[]
     */
    public function allStars(): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE star_post_id IS NOT NULL ORDER BY id",
                Schema::table(Schema::TABLE_NAV_NODES)
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Node::fromRow($row), $rows);
    }

    /**
     * Find nodes within a distance from a point.
     *
     * @return Node[]
     */
    public function withinDistance(float $x, float $y, float $z, float $maxDistance): array
    {
        global $wpdb;

        // Use squared distance to avoid sqrt in query
        $maxDistanceSquared = $maxDistance * $maxDistance;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT *,
                    POWER(x - %f, 2) + POWER(y - %f, 2) + POWER(z - %f, 2) AS dist_squared
                FROM %i
                HAVING dist_squared <= %f
                ORDER BY dist_squared",
                $x,
                $y,
                $z,
                Schema::table(Schema::TABLE_NAV_NODES),
                $maxDistanceSquared
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Node::fromRow($row), $rows);
    }

    /**
     * Find nodes within distance from another node.
     *
     * @return Node[]
     */
    public function neighborsOf(Node $node, float $maxDistance): array
    {
        $nodes = $this->withinDistance($node->x, $node->y, $node->z, $maxDistance);

        // Filter out the source node itself
        return array_filter($nodes, fn($n) => $n->id !== $node->id);
    }

    /**
     * Save a node (insert or update).
     */
    public function save(Node $node): Node
    {
        global $wpdb;

        $data = $node->toRow();
        $table = Schema::table(Schema::TABLE_NAV_NODES);

        if ($node->id === 0) {
            $wpdb->insert($table, $data);
            $id = (int) $wpdb->insert_id;
        } else {
            $wpdb->update($table, $data, ['id' => $node->id]);
            $id = $node->id;
        }

        return $this->get($id);
    }

    /**
     * Create a node.
     *
     * For star nodes: provide starPostId
     * For waypoints: provide hash
     */
    public function create(
        float $x,
        float $y,
        float $z,
        ?int $starPostId = null,
        ?string $hash = null,
        int $algorithmVersion = 1,
    ): Node {
        // If hash provided, check for existing waypoint
        if ($hash !== null) {
            $existing = $this->getByHash($hash);
            if ($existing !== null) {
                return $existing;
            }
        }

        $node = new Node(
            id: 0,
            x: $x,
            y: $y,
            z: $z,
            starPostId: $starPostId,
            hash: $hash,
            algorithmVersion: $algorithmVersion,
        );

        return $this->save($node);
    }

    /**
     * Delete a node by ID.
     */
    public function delete(int $id): bool
    {
        global $wpdb;

        $result = $wpdb->delete(
            Schema::table(Schema::TABLE_NAV_NODES),
            ['id' => $id],
            ['%d']
        );

        return $result !== false;
    }

    /**
     * Count all nodes.
     */
    public function count(): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i",
                Schema::table(Schema::TABLE_NAV_NODES)
            )
        );
    }

    /**
     * Count star nodes.
     */
    public function countStars(): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i WHERE star_post_id IS NOT NULL",
                Schema::table(Schema::TABLE_NAV_NODES)
            )
        );
    }

    /**
     * Count waypoint nodes.
     */
    public function countWaypoints(): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i WHERE star_post_id IS NULL",
                Schema::table(Schema::TABLE_NAV_NODES)
            )
        );
    }
}
