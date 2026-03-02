<?php

declare(strict_types=1);

namespace Helm\Inventory\Contracts;

use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;

/**
 * Repository contract for inventory operations.
 */
interface InventoryRepository
{
    /**
     * Find an inventory item by ID.
     *
     * @param int $id
     * @return Item|null
     */
    public function find(int $id): ?Item;

    /**
     * Find all inventory items for a user.
     *
     * @param int $userId
     * @return array<Item>
     */
    public function findForUser(int $userId): array;

    /**
     * Find inventory items at a specific location.
     *
     * @param int $userId
     * @param LocationType $locationType
     * @param int|null $locationId
     * @return array<Item>
     */
    public function findAtLocation(int $userId, LocationType $locationType, ?int $locationId = null): array;

    /**
     * Find fitted component summary for an entity.
     *
     * Lightweight query for REST responses - returns raw arrays, not model objects.
     *
     * @param LocationType $locationType
     * @param int $locationId
     * @return array<array{id: int, product_id: int, slot: string, life: int|null, usage_count: int, condition: float, created_at: string, updated_at: string}>
     */
    public function findFittedByLocation(LocationType $locationType, int $locationId): array;

    /**
     * Find a cargo item (loose, no slot) at a specific location by product type.
     *
     * @param int $userId
     * @param string $productType
     * @param int $productId
     * @param LocationType $locationType
     * @param int $locationId
     * @return Item|null
     */
    public function findCargoAtLocation(
        int $userId,
        string $productType,
        int $productId,
        LocationType $locationType,
        int $locationId
    ): ?Item;

    /**
     * Find all cargo items (loose, no slot) at a specific location.
     *
     * @param int $userId
     * @param LocationType $locationType
     * @param int $locationId
     * @param string|null $productType
     * @return array<Item>
     */
    public function findAllCargoAtLocation(
        int $userId,
        LocationType $locationType,
        int $locationId,
        ?string $productType = null
    ): array;

    /**
     * Find an inventory item by its product reference.
     *
     * @param int $userId
     * @param int $productId
     * @return Item|null
     */
    public function findByProduct(int $userId, int $productId): ?Item;

    /**
     * Insert a new inventory item.
     *
     * @param Item $item
     * @return int|false The inventory item ID on success, false on failure.
     */
    public function insert(Item $item): int|false;

    /**
     * Update an inventory item.
     *
     * @param Item $item
     * @return bool
     */
    public function update(Item $item): bool;

    /**
     * Delete an inventory item.
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool;
}
