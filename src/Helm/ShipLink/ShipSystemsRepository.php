<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use BackedEnum;
use DateTimeImmutable;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\ShipLink\Models\ShipSystems;
use Helm\StellarWP\Models\Model;

/**
 * Repository for ship systems (component config) table operations.
 *
 * Handles CRUD operations for the helm_ship_systems custom table.
 */
final class ShipSystemsRepository
{
    /**
     * Find ship systems by post ID.
     */
    public function find(int $shipPostId): ?ShipSystems
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE ship_post_id = %d",
                $shipPostId
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * Find or create ship systems for a post ID.
     *
     * If no systems record exists, creates one with defaults.
     */
    public function findOrCreate(int $shipPostId): ShipSystems
    {
        $systems = $this->find($shipPostId);

        if ($systems !== null) {
            return $systems;
        }

        $systems = ShipSystems::defaults($shipPostId);
        $this->insert($systems);

        return $systems;
    }

    /**
     * Check if systems exist for a ship.
     */
    public function exists(int $shipPostId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE ship_post_id = %d",
                $shipPostId
            )
        );

        return (int) $count > 0;
    }

    /**
     * Insert a new ship systems record.
     */
    public function insert(ShipSystems $systems): bool
    {
        global $wpdb;

        $now = Date::now();
        $systems->created_at = $now;
        $systems->updated_at = $now;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;
        $row = $this->serialize($systems->toArray(), $systems);

        $result = $wpdb->insert($table, $row);

        if ($result !== false) {
            $systems->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Update an existing ship systems record.
     *
     * Uses dirty tracking for efficient partial updates.
     */
    public function update(ShipSystems $systems): bool
    {
        global $wpdb;

        $dirty = $systems->getDirty();

        if ($dirty === []) {
            return true; // Nothing to update
        }

        $systems->updated_at = Date::now();
        $dirty = $systems->getDirty();

        $row = $this->serialize($dirty, $systems);
        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $result = $wpdb->update(
            $table,
            $row,
            ['ship_post_id' => $systems->ship_post_id]
        );

        if ($result !== false) {
            $systems->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Save ship systems (insert or update).
     */
    public function save(ShipSystems $systems): bool
    {
        if (!$this->exists($systems->ship_post_id)) {
            return $this->insert($systems);
        }

        return $this->update($systems);
    }

    /**
     * Delete ship systems by post ID.
     */
    public function delete(int $shipPostId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $result = $wpdb->delete($table, ['ship_post_id' => $shipPostId]);

        return $result !== false;
    }

    /**
     * Get ships with low core life.
     *
     * @param float $threshold Core life threshold
     * @return array<ShipSystems>
     */
    public function withLowCoreLife(float $threshold = 100.0): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE core_life < %f ORDER BY core_life ASC",
                $threshold
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Count total ships with systems records.
     */
    public function count(): int
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): ShipSystems
    {
        $model = ShipSystems::fromData(
            $row,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $model->syncOriginal();

        return $model;
    }

    /**
     * Serialize model values for database storage.
     *
     * @param array<string, mixed> $values
     * @return array<string, mixed>
     */
    private function serialize(array $values, ShipSystems $model): array
    {
        $row = [];

        foreach ($values as $key => $value) {
            if (!$model->isSet($key)) {
                continue;
            }

            $row[$key] = match (true) {
                $value instanceof BackedEnum => $value->value,
                $value instanceof DateTimeImmutable => $value->format('Y-m-d H:i:s'),
                default => $value,
            };
        }

        return $row;
    }
}
