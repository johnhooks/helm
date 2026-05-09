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
    private const CACHE_GROUP = 'helm_user_edges';

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

        $this->setLastChanged($userId);
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

    /**
     * @param int[] $edgeIds
     * @return UserEdge[]
     */
    public function getMany(int $userId, array $edgeIds): array
    {
        global $wpdb;

        $edgeIds = array_values(array_unique(array_filter(
            array_map('intval', $edgeIds),
            fn (int $edgeId) => $edgeId > 0
        )));

        if ($edgeIds === []) {
            return [];
        }

        $cacheKey = $this->getManyCacheKey($userId, $edgeIds);
        $cached = wp_cache_get($cacheKey, self::CACHE_GROUP);
        if (is_array($cached)) {
            /** @var UserEdge[] $cached */
            return $cached;
        }

        $userEdgeTable = $wpdb->prefix . Schema::TABLE_USER_EDGE;
        $edgesTable = $wpdb->prefix . Schema::TABLE_NAV_EDGES;
        $placeholders = implode(',', array_fill(0, count($edgeIds), '%d'));

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT ue.user_id, ue.edge_id, ue.discovered_at,
                        e.node_a_id, e.node_b_id, e.distance
                FROM {$userEdgeTable} ue
                INNER JOIN {$edgesTable} e ON e.id = ue.edge_id
                WHERE ue.user_id = %d
                  AND ue.edge_id IN ({$placeholders})
                ORDER BY ue.discovered_at ASC, ue.id ASC",
                $userId,
                ...$edgeIds
            ),
            ARRAY_A
        );

        $edges = array_map(fn ($row) => UserEdge::fromRow($row), $rows ?? []);
        wp_cache_set($cacheKey, $edges, self::CACHE_GROUP);

        return $edges;
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

    private function setLastChanged(int $userId): void
    {
        wp_cache_set($this->lastChangedKey($userId), microtime(), self::CACHE_GROUP);
    }

    private function getLastChanged(int $userId): string
    {
        $key = $this->lastChangedKey($userId);
        $lastChanged = wp_cache_get($key, self::CACHE_GROUP);

        if (!is_string($lastChanged) || $lastChanged === '') {
            $lastChanged = microtime();
            wp_cache_set($key, $lastChanged, self::CACHE_GROUP);
        }

        return $lastChanged;
    }

    /**
     * @param int[] $edgeIds
     */
    private function getManyCacheKey(int $userId, array $edgeIds): string
    {
        return sprintf(
            'get_many:%d:%s:%s',
            $userId,
            $this->getLastChanged($userId),
            implode(',', $edgeIds)
        );
    }

    private function lastChangedKey(int $userId): string
    {
        return "last_changed:{$userId}";
    }
}
