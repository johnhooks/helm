<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\ShipLink\Models\ShipFitting;
use Helm\StellarWP\Models\Model;

/**
 * Repository for ship fitting pivot table operations.
 */
final class ShipFittingRepository
{
    /**
     * Find all fittings for a ship.
     *
     * @return array<ShipFitting>
     */
    public function findForShip(int $shipPostId): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE ship_post_id = %d ORDER BY slot",
                $shipPostId
            ),
            ARRAY_A
        );

        return array_map(
            fn (array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find fitted component summary for a ship.
     *
     * Lightweight query for REST responses - joins fittings with components
     * but not products. Returns raw arrays, not model objects.
     *
     * @return array<array{id: int, product_id: int, slot: string, life: int|null, usage_count: int, condition: float}>
     */
    public function findFittedByShip(int $shipPostId): array
    {
        global $wpdb;

        $fittingsTable = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;
        $componentsTable = $wpdb->prefix . Schema::TABLE_SHIP_COMPONENTS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT
                    c.id,
                    c.product_id,
                    f.slot,
                    c.life,
                    c.usage_count,
                    c.`condition`
                FROM {$fittingsTable} f
                JOIN {$componentsTable} c ON c.id = f.component_id
                WHERE f.ship_post_id = %d
                ORDER BY f.slot",
                $shipPostId
            ),
            ARRAY_A
        );

        // Cast types for consistency
        return array_map(
            fn (array $row) => [
                'id' => (int) $row['id'],
                'product_id' => (int) $row['product_id'],
                'slot' => $row['slot'],
                'life' => $row['life'] !== null ? (int) $row['life'] : null,
                'usage_count' => (int) $row['usage_count'],
                'condition' => (float) $row['condition'],
            ],
            $rows
        );
    }

    /**
     * Find a fitting by ship and slot.
     */
    public function findBySlot(int $shipPostId, ShipFittingSlot|string $slot): ?ShipFitting
    {
        global $wpdb;

        $slotValue = $slot instanceof ShipFittingSlot ? $slot->value : $slot;
        $table = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE ship_post_id = %d AND slot = %s",
                $shipPostId,
                $slotValue
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * Install a component into a ship slot.
     */
    public function install(ShipFitting $fitting): bool
    {
        global $wpdb;

        $fitting->installed_at = Date::now();

        $table = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;

        $result = $wpdb->insert($table, [
            'ship_post_id' => $fitting->ship_post_id,
            'component_id' => $fitting->component_id,
            'slot' => $fitting->slot->value,
            'installed_at' => $fitting->installed_at->format('Y-m-d H:i:s'),
        ]);

        if ($result !== false) {
            $fitting->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Uninstall a component from a ship slot.
     */
    public function uninstall(int $shipPostId, ShipFittingSlot|string $slot): bool
    {
        global $wpdb;

        $slotValue = $slot instanceof ShipFittingSlot ? $slot->value : $slot;
        $table = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;

        $result = $wpdb->delete($table, [
            'ship_post_id' => $shipPostId,
            'slot' => $slotValue,
        ]);

        return $result !== false;
    }

    /**
     * Delete all fittings for a ship.
     */
    public function deleteForShip(int $shipPostId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;

        $result = $wpdb->delete($table, ['ship_post_id' => $shipPostId]);

        return $result !== false;
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): ShipFitting
    {
        $model = ShipFitting::fromData(
            $row,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $model->syncOriginal();

        return $model;
    }
}
