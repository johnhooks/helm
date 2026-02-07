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
     * Find multiple nodes by ID.
     *
     * @param int[] $ids
     * @return Node[] Indexed by node ID
     */
    public function getMany(array $ids): array
    {
        global $wpdb;

        if ($ids === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '%d'));

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE id IN ($placeholders)",
                Schema::table(Schema::TABLE_NAV_NODES),
                ...$ids
            ),
            ARRAY_A
        );

        $nodes = [];
        foreach ($rows as $row) {
            $node = Node::fromRow($row);
            $nodes[$node->id] = $node;
        }

        return $nodes;
    }

    /**
     * Paginate nodes with optional type filter.
     *
     * @return array{nodes: Node[], total: int}
     */
    public function paginate(?NodeType $type = null, int $page = 1, int $perPage = 100): array
    {
        global $wpdb;

        $table = Schema::table(Schema::TABLE_NAV_NODES);
        $offset = ($page - 1) * $perPage;

        if ($type !== null) {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM %i WHERE type = %d ORDER BY id LIMIT %d OFFSET %d",
                    $table,
                    $type->value,
                    $perPage,
                    $offset
                ),
                ARRAY_A
            );

            $total = (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(*) FROM %i WHERE type = %d",
                    $table,
                    $type->value
                )
            );
        } else {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM %i ORDER BY id LIMIT %d OFFSET %d",
                    $table,
                    $perPage,
                    $offset
                ),
                ARRAY_A
            );

            $total = (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(*) FROM %i",
                    $table
                )
            );
        }

        return [
            'nodes' => array_map(fn($row) => Node::fromRow($row), $rows),
            'total' => $total,
        ];
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
     * Find all system nodes.
     *
     * @return Node[]
     */
    public function allSystems(): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE type = %d ORDER BY id",
                Schema::table(Schema::TABLE_NAV_NODES),
                NodeType::System->value
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Node::fromRow($row), $rows);
    }

    /**
     * Find nodes within a distance from a point.
     *
     * Uses bounding box pre-filter with the coords index,
     * then refines with actual spherical distance.
     *
     * @return Node[]
     */
    public function withinDistance(float $x, float $y, float $z, float $maxDistance): array
    {
        global $wpdb;

        // Use squared distance to avoid sqrt in query
        $maxDistanceSquared = $maxDistance * $maxDistance;

        // Bounding box filter uses the coords index
        // HAVING then refines to spherical distance
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT *,
                    POWER(x - %f, 2) + POWER(y - %f, 2) + POWER(z - %f, 2) AS dist_squared
                FROM %i
                WHERE x BETWEEN %f AND %f
                  AND y BETWEEN %f AND %f
                  AND z BETWEEN %f AND %f
                HAVING dist_squared <= %f
                ORDER BY dist_squared",
                $x,
                $y,
                $z,
                Schema::table(Schema::TABLE_NAV_NODES),
                $x - $maxDistance,
                $x + $maxDistance,
                $y - $maxDistance,
                $y + $maxDistance,
                $z - $maxDistance,
                $z + $maxDistance,
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
     * For system nodes: provide type NodeType::System
     * For waypoints: provide hash
     */
    public function create(
        float $x,
        float $y,
        float $z,
        NodeType $type = NodeType::Waypoint,
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
            type: $type,
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
     * Count system nodes.
     */
    public function countSystems(): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i WHERE type = %d",
                Schema::table(Schema::TABLE_NAV_NODES),
                NodeType::System->value
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
                "SELECT COUNT(*) FROM %i WHERE type = %d",
                Schema::table(Schema::TABLE_NAV_NODES),
                NodeType::Waypoint->value
            )
        );
    }
}
