<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use DateTimeImmutable;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\ShipLink\Models\ShipComponent;
use Helm\StellarWP\Models\Model;

/**
 * Repository for ship component instances.
 */
final class ShipComponentRepository
{
    /**
     * Find a ship component by ID.
     */
    public function find(int $id): ?ShipComponent
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_COMPONENTS;

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
     * Insert a new ship component.
     *
     * @return int|false The inserted ID on success, false on failure
     */
    public function insert(ShipComponent $component): int|false
    {
        global $wpdb;

        $now = Date::now();
        $component->created_at = $now;
        $component->updated_at = $now;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_COMPONENTS;
        $row = $this->serialize($component->toArray(), $component);

        $result = $wpdb->insert($table, $row);

        if ($result === false) {
            return false;
        }

        return (int) $wpdb->insert_id;
    }

    /**
     * Update an existing ship component.
     *
     * Uses dirty tracking for efficient partial updates.
     */
    public function update(ShipComponent $component): bool
    {
        global $wpdb;

        $dirty = $component->getDirty();

        if ($dirty === []) {
            return true;
        }

        $component->updated_at = Date::now();
        $dirty = $component->getDirty();

        $row = $this->serialize($dirty, $component);
        $table = $wpdb->prefix . Schema::TABLE_SHIP_COMPONENTS;

        $result = $wpdb->update(
            $table,
            $row,
            ['id' => $component->id]
        );

        if ($result !== false) {
            $component->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Delete a ship component.
     */
    public function delete(int $id): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_COMPONENTS;

        $result = $wpdb->delete($table, ['id' => $id]);

        return $result !== false;
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): ShipComponent
    {
        $model = ShipComponent::fromData(
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
    private function serialize(array $values, ShipComponent $model): array
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
