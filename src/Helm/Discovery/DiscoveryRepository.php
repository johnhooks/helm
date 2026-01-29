<?php

declare(strict_types=1);

namespace Helm\Discovery;

use Helm\Database\Schema;

/**
 * Repository for Discovery storage.
 */
final class DiscoveryRepository
{
    public function __construct(
        private readonly \wpdb $wpdb,
    ) {}

    /**
     * Save a discovery.
     */
    public function save(Discovery $discovery): Discovery
    {
        $table = $this->tableName();

        $this->wpdb->insert(
            $table,
            $discovery->toRow(),
            ['%s', '%s', '%s', '%d', '%d']
        );

        $id = (int) $this->wpdb->insert_id;

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
        $table = $this->tableName();

        return (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
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
        $table = $this->tableName();

        $row = $this->wpdb->get_row(
            $this->wpdb->prepare(
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
        $table = $this->tableName();

        $rows = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM {$table} WHERE ship_id = %s ORDER BY discovered_at DESC",
                $shipId
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => Discovery::fromRow($row),
            $rows ?: []
        );
    }

    /**
     * Find all discoveries for a star.
     *
     * @return array<Discovery>
     */
    public function findByStarId(string $starId): array
    {
        $table = $this->tableName();

        $rows = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM {$table} WHERE star_id = %s ORDER BY discovered_at ASC",
                $starId
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => Discovery::fromRow($row),
            $rows ?: []
        );
    }

    /**
     * Find all first discoveries.
     *
     * @return array<Discovery>
     */
    public function findFirstDiscoveries(int $limit = 100): array
    {
        $table = $this->tableName();

        $rows = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT * FROM {$table} WHERE is_first = 1 ORDER BY discovered_at DESC LIMIT %d",
                $limit
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => Discovery::fromRow($row),
            $rows ?: []
        );
    }

    /**
     * Check if a ship has discovered a star.
     */
    public function existsByShipAndStar(string $shipId, string $starId): bool
    {
        $table = $this->tableName();

        return (bool) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT 1 FROM {$table} WHERE ship_id = %s AND star_id = %s LIMIT 1",
                $shipId,
                $starId
            )
        );
    }

    /**
     * Get the full table name.
     */
    private function tableName(): string
    {
        return Schema::table(Schema::TABLE_DISCOVERIES);
    }
}
