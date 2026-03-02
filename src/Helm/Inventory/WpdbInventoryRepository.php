<?php

declare(strict_types=1);

namespace Helm\Inventory;

use Helm\Database\Schema;
use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Inventory\Models\Item;
use Helm\Lib\Date;
use Helm\Lib\HydratesModels;
use Helm\StellarWP\Models\Model;

/**
 * Repository for inventory operations.
 */
final class WpdbInventoryRepository implements InventoryRepository
{
    use HydratesModels;

    /**
     * Find all inventory items for a user.
     *
     * @return array<Item>
     */
    public function findForUser(int $userId): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_INVENTORY;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE user_id = %d ORDER BY created_at DESC",
                $userId
            ),
            ARRAY_A
        );

        return array_map(
            fn (array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find inventory items at a specific location.
     *
     * @return array<Item>
     */
    public function findAtLocation(int $userId, LocationType $locationType, ?int $locationId = null): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_INVENTORY;

        if ($locationId === null) {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$table} WHERE user_id = %d AND location_type = %d AND location_id IS NULL ORDER BY created_at DESC",
                    $userId,
                    $locationType->value
                ),
                ARRAY_A
            );
        } else {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM {$table} WHERE user_id = %d AND location_type = %d AND location_id = %d ORDER BY created_at DESC",
                    $userId,
                    $locationType->value,
                    $locationId
                ),
                ARRAY_A
            );
        }

        return array_map(
            fn (array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find an inventory item by ID.
     */
    public function find(int $id): ?Item
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_INVENTORY;

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
     * Find fitted component summary for an entity.
     *
     * Lightweight query for REST responses - returns raw arrays, not model objects.
     * Joins to products to compute condition as life/hp.
     *
     * @return array<array{id: int, product_id: int, slot: string, life: int|null, usage_count: int, condition: float, created_at: string, updated_at: string}>
     */
    public function findFittedByLocation(LocationType $locationType, int $locationId): array
    {
        global $wpdb;

        $inventoryTable = $wpdb->prefix . Schema::TABLE_INVENTORY;
        $productsTable = $wpdb->prefix . Schema::TABLE_PRODUCTS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT i.id, i.product_id, i.slot, i.life, i.usage_count, i.created_at, i.updated_at, p.hp
                FROM {$inventoryTable} i
                JOIN {$productsTable} p ON p.id = i.product_id
                WHERE i.location_type = %d AND i.location_id = %d AND i.slot IS NOT NULL
                ORDER BY i.slot",
                $locationType->value,
                $locationId
            ),
            ARRAY_A
        );

        // Cast types and compute condition
        return array_map(
            function (array $row) {
                $life = $row['life'] !== null ? (int) $row['life'] : null;
                $hp = $row['hp'] !== null ? (int) $row['hp'] : null;

                // Compute condition: life/hp, or 1.0 if hp is null/0
                $condition = 1.0;
                if ($hp !== null && $hp > 0 && $life !== null) {
                    $condition = $life / $hp;
                }

                return [
                    'id' => (int) $row['id'],
                    'product_id' => (int) $row['product_id'],
                    'slot' => $row['slot'],
                    'life' => $life,
                    'usage_count' => (int) $row['usage_count'],
                    'condition' => $condition,
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at'],
                ];
            },
            $rows
        );
    }

    /**
     * Find a cargo item (loose, no slot) at a specific location by product type.
     *
     * Joins to products to filter by product type (e.g., 'resource').
     */
    public function findCargoAtLocation(
        int $userId,
        string $productType,
        int $productId,
        LocationType $locationType,
        int $locationId
    ): ?Item {
        global $wpdb;

        $inventoryTable = $wpdb->prefix . Schema::TABLE_INVENTORY;
        $productsTable = $wpdb->prefix . Schema::TABLE_PRODUCTS;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT i.* FROM {$inventoryTable} i
                JOIN {$productsTable} p ON p.id = i.product_id
                WHERE i.user_id = %d
                  AND i.product_id = %d
                  AND i.location_type = %d
                  AND i.location_id = %d
                  AND i.slot IS NULL
                  AND p.type = %s",
                $userId,
                $productId,
                $locationType->value,
                $locationId,
                $productType
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * Find all cargo items (loose, no slot) at a specific location.
     *
     * Optionally filter by product type (e.g., 'resource').
     *
     * @return array<Item>
     */
    public function findAllCargoAtLocation(
        int $userId,
        LocationType $locationType,
        int $locationId,
        ?string $productType = null
    ): array {
        global $wpdb;

        $inventoryTable = $wpdb->prefix . Schema::TABLE_INVENTORY;
        $productsTable = $wpdb->prefix . Schema::TABLE_PRODUCTS;

        if ($productType !== null) {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT i.* FROM {$inventoryTable} i
                    JOIN {$productsTable} p ON p.id = i.product_id
                    WHERE i.user_id = %d
                      AND i.location_type = %d
                      AND i.location_id = %d
                      AND i.slot IS NULL
                      AND p.type = %s
                    ORDER BY i.created_at DESC",
                    $userId,
                    $locationType->value,
                    $locationId,
                    $productType
                ),
                ARRAY_A
            );
        } else {
            $rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT i.* FROM {$inventoryTable} i
                    WHERE i.user_id = %d
                      AND i.location_type = %d
                      AND i.location_id = %d
                      AND i.slot IS NULL
                    ORDER BY i.created_at DESC",
                    $userId,
                    $locationType->value,
                    $locationId
                ),
                ARRAY_A
            );
        }

        return array_map(
            fn (array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find an inventory item by its product reference.
     */
    public function findByProduct(int $userId, int $productId): ?Item
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_INVENTORY;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE user_id = %d AND product_id = %d",
                $userId,
                $productId
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * Insert a new inventory item.
     *
     * @return int|false The inventory item ID on success, false on failure.
     */
    public function insert(Item $item): int|false
    {
        global $wpdb;

        $now = Date::now();
        $item->created_at = $now;
        $item->updated_at = $now;

        $table = $wpdb->prefix . Schema::TABLE_INVENTORY;
        $row = $this->serializeToDbRow($item->toArray(), $item);

        $result = $wpdb->insert($table, $row);

        if ($result === false) {
            return false;
        }

        $item->syncOriginal();

        return (int) $wpdb->insert_id;
    }

    /**
     * Update an inventory item.
     */
    public function update(Item $item): bool
    {
        global $wpdb;

        if (!$item->isDirty()) {
            return true;
        }

        $item->updated_at = Date::now();

        $table = $wpdb->prefix . Schema::TABLE_INVENTORY;
        $row = $this->serializeToDbRow($item->getDirty(), $item);

        $result = $wpdb->update(
            $table,
            $row,
            ['id' => $item->id]
        );

        if ($result !== false) {
            $item->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Delete an inventory item.
     */
    public function delete(int $id): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_INVENTORY;

        $result = $wpdb->delete($table, ['id' => $id]);

        return $result !== false;
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): Item
    {
        /** @var Item */
        return $this->hydrateModel(Item::class, $row);
    }
}
