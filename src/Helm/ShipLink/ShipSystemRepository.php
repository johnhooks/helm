<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use DateTimeImmutable;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\ShipLink\Models\ShipSystem;
use Helm\StellarWP\Models\Model;

/**
 * Repository for ship system component instances.
 */
final class ShipSystemRepository
{
    /**
     * Find a ship system by ID.
     */
    public function find(int $id): ?ShipSystem
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE id = %d",
                $id
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * Insert a new ship system component.
     *
     * @return int|false The inserted ID on success, false on failure
     */
    public function insert(ShipSystem $system): int|false
    {
        global $wpdb;

        $now = Date::now();
        $system->created_at = $now;
        $system->updated_at = $now;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;
        $row = $this->serialize($system->toArray(), $system);

        $result = $wpdb->insert($table, $row);

        if ($result === false) {
            return false;
        }

        return (int) $wpdb->insert_id;
    }

    /**
     * Update an existing ship system component.
     *
     * Uses dirty tracking for efficient partial updates.
     */
    public function update(ShipSystem $system): bool
    {
        global $wpdb;

        $dirty = $system->getDirty();

        if ($dirty === []) {
            return true;
        }

        $system->updated_at = Date::now();
        $dirty = $system->getDirty();

        $row = $this->serialize($dirty, $system);
        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $result = $wpdb->update(
            $table,
            $row,
            ['id' => $system->id]
        );

        if ($result !== false) {
            $system->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Delete a ship system component.
     */
    public function delete(int $id): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $result = $wpdb->delete($table, ['id' => $id]);

        return $result !== false;
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): ShipSystem
    {
        $model = ShipSystem::fromData(
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
    private function serialize(array $values, ShipSystem $model): array
    {
        $row = [];

        foreach ($values as $key => $value) {
            if ($key === 'id' || !$model->isSet($key)) {
                continue;
            }

            $row[$key] = match (true) {
                $value instanceof DateTimeImmutable => $value->format('Y-m-d H:i:s'),
                is_array($value) => json_encode($value),
                default => $value,
            };
        }

        return $row;
    }
}
