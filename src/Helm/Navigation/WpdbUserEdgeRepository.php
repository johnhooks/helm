<?php

declare(strict_types=1);

namespace Helm\Navigation;

use DateTimeImmutable;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\UserEdgeRepository;

/**
 * Per-player edge discovery repository backed by wpdb.
 *
 * The upsert path uses INSERT IGNORE so re-scanning a known edge does
 * not bump discovered_at. That matters for the freshness headers on
 * the /edges endpoint: they must reflect genuinely new discoveries,
 * not re-observations.
 */
final class WpdbUserEdgeRepository implements UserEdgeRepository
{
    public function upsert(int $userId, int $edgeId): void
    {
        global $wpdb;

        $table = Schema::table(Schema::TABLE_USER_EDGE);

        $wpdb->query(
            $wpdb->prepare(
                "INSERT IGNORE INTO %i (user_id, edge_id, discovered_at) VALUES (%d, %d, %s)",
                $table,
                $userId,
                $edgeId,
                Date::now()->format('Y-m-d H:i:s'),
            )
        );
    }

    /**
     * @return array{edges: UserEdge[], total: int}
     */
    public function paginate(int $userId, int $page, int $perPage): array
    {
        global $wpdb;

        $userEdgeTable = $wpdb->prefix . Schema::TABLE_USER_EDGE;
        $edgesTable = $wpdb->prefix . Schema::TABLE_NAV_EDGES;
        $offset = max(0, ($page - 1) * $perPage);

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT ue.user_id, ue.edge_id, ue.discovered_at,
                        e.node_a_id, e.node_b_id, e.distance
                FROM {$userEdgeTable} ue
                INNER JOIN {$edgesTable} e ON e.id = ue.edge_id
                WHERE ue.user_id = %d
                ORDER BY ue.discovered_at ASC, ue.id ASC
                LIMIT %d OFFSET %d",
                $userId,
                $perPage,
                $offset
            ),
            ARRAY_A
        );

        $edges = array_map(fn ($row) => UserEdge::fromRow($row), $rows ?? []);

        $total = (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*)
                FROM {$userEdgeTable} ue
                INNER JOIN {$edgesTable} e ON e.id = ue.edge_id
                WHERE ue.user_id = %d",
                $userId
            )
        );

        return [
            'edges' => $edges,
            'total' => $total,
        ];
    }

    public function count(int $userId): int
    {
        global $wpdb;

        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i WHERE user_id = %d",
                Schema::table(Schema::TABLE_USER_EDGE),
                $userId
            )
        );

        return (int) $count;
    }

    public function lastDiscovered(int $userId): ?string
    {
        global $wpdb;

        $userEdgeTable = $wpdb->prefix . Schema::TABLE_USER_EDGE;
        $edgesTable = $wpdb->prefix . Schema::TABLE_NAV_EDGES;

        $max = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT MAX(ue.discovered_at)
                FROM {$userEdgeTable} ue
                INNER JOIN {$edgesTable} e ON e.id = ue.edge_id
                WHERE ue.user_id = %d",
                $userId
            )
        );

        if ($max === null || $max === '') {
            return null;
        }

        // Stored as MySQL datetime in UTC; format as ISO 8601.
        $dt = new DateTimeImmutable($max . ' UTC');
        return $dt->format('c');
    }
}
