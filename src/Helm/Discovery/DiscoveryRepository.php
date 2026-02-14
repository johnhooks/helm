<?php

declare(strict_types=1);

namespace Helm\Discovery;

use Helm\Database\Schema;

/**
 * Repository for Discovery storage.
 */
final class DiscoveryRepository
{
    /**
     * Save a discovery.
     */
    public function save(Discovery $discovery): Discovery
    {
        global $wpdb;

        $table = $this->tableName();

        $wpdb->insert(
            $table,
            $discovery->toRow(),
            ['%s', '%s', '%s', '%d', '%d']
        );

        $id = (int) $wpdb->insert_id;

        return new Discovery(
            id: $id,
            starId: $discovery->starId,
            shipId: $discovery->shipId,
            contentsHash: $discovery->contentsHash,
            isFirst: $discovery->isFirst,
            discoveredAt: $discovery->discoveredAt,
        );
    }

    /**
     * Count discoveries for a star.
     */
    public function countByStarId(string $starId): int
    {
        global $wpdb;

        $table = $this->tableName();

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE star_id = %s",
                $starId
            )
        );
    }

    /**
     * Get the first discovery for a star.
     */
    public function getFirstByStarId(string $starId): ?Discovery
    {
        global $wpdb;

        $table = $this->tableName();

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE star_id = %s AND is_first = 1 LIMIT 1",
                $starId
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return Discovery::fromRow($row);
    }

    /**
     * Find all discoveries by a ship.
     *
     * @return array<Discovery>
     */
    public function findByShipId(string $shipId): array
    {
        global $wpdb;

        $table = $this->tableName();

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE ship_id = %s ORDER BY discovered_at DESC",
                $shipId
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => Discovery::fromRow($row),
            $rows ?? []
        );
    }

    /**
     * Find all discoveries for a star.
     *
     * @return array<Discovery>
     */
    public function findByStarId(string $starId): array
    {
        global $wpdb;

        $table = $this->tableName();

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE star_id = %s ORDER BY discovered_at ASC",
                $starId
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => Discovery::fromRow($row),
            $rows ?? []
        );
    }

    /**
     * Find all first discoveries.
     *
     * @return array<Discovery>
     */
    public function findFirstDiscoveries(int $limit = 100): array
    {
        global $wpdb;

        $table = $this->tableName();

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE is_first = 1 ORDER BY discovered_at DESC LIMIT %d",
                $limit
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => Discovery::fromRow($row),
            $rows ?? []
        );
    }

    /**
     * Check if a ship has discovered a star.
     */
    public function existsByShipAndStar(string $shipId, string $starId): bool
    {
        global $wpdb;

        $table = $this->tableName();

        return (bool) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT 1 FROM {$table} WHERE ship_id = %s AND star_id = %s LIMIT 1",
                $shipId,
                $starId
            )
        );
    }

    private function tableName(): string
    {
        return Schema::table(Schema::TABLE_DISCOVERIES);
    }
}
