<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use DateTimeImmutable;
use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\ShipLink\Models\Fitting;
use Helm\StellarWP\Models\Model;

/**
 * Repository for ship fitting pivot table operations.
 */
final class FittingRepository
{
    /**
     * Find all fittings for a ship.
     *
     * @return array<Fitting>
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
     * Find a fitting by ship and slot.
     */
    public function findBySlot(int $shipPostId, FittingSlot|string $slot): ?Fitting
    {
        global $wpdb;

        $slotValue = $slot instanceof FittingSlot ? $slot->value : $slot;
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
    public function install(Fitting $fitting): bool
    {
        global $wpdb;

        $fitting->installed_at = Date::now();

        $table = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;

        $result = $wpdb->insert($table, [
            'ship_post_id' => $fitting->ship_post_id,
            'system_id' => $fitting->system_id,
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
    public function uninstall(int $shipPostId, FittingSlot|string $slot): bool
    {
        global $wpdb;

        $slotValue = $slot instanceof FittingSlot ? $slot->value : $slot;
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
    private function hydrate(array $row): Fitting
    {
        $model = Fitting::fromData(
            $row,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $model->syncOriginal();

        return $model;
    }
}
