<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;
use Helm\Lib\Date;

/**
 * In-memory inventory repository for simulation.
 */
final class MemoryInventoryRepository implements InventoryRepository
{
    /** @var array<int, Item> Indexed by item ID */
    private array $items = [];

    private int $nextId = 1;

    public function find(int $id): ?Item
    {
        return $this->items[$id] ?? null;
    }

    public function findForUser(int $userId): array
    {
        throw new \BadMethodCallException('MemoryInventoryRepository::findForUser() is not implemented.');
    }

    public function findAtLocation(int $userId, LocationType $locationType, ?int $locationId = null): array
    {
        return array_values(array_filter(
            $this->items,
            static function (Item $item) use ($userId, $locationType, $locationId) {
                if ($item->user_id !== $userId) {
                    return false;
                }

                if ($item->location_type !== $locationType) {
                    return false;
                }

                if ($locationId !== null && $item->location_id !== $locationId) {
                    return false;
                }

                return true;
            },
        ));
    }

    public function findFittedByLocation(LocationType $locationType, int $locationId): array
    {
        throw new \BadMethodCallException('MemoryInventoryRepository::findFittedByLocation() is not implemented.');
    }

    public function findCargoAtLocation(
        int $userId,
        string $productType,
        int $productId,
        LocationType $locationType,
        int $locationId
    ): ?Item {
        foreach ($this->items as $item) {
            if (
                $item->user_id === $userId
                && $item->product_id === $productId
                && $item->location_type === $locationType
                && $item->location_id === $locationId
                && $item->slot === null
            ) {
                return $item;
            }
        }

        return null;
    }

    public function findAllCargoAtLocation(
        int $userId,
        LocationType $locationType,
        int $locationId,
        ?string $productType = null
    ): array {
        return array_values(array_filter(
            $this->items,
            static function (Item $item) use ($userId, $locationType, $locationId) {
                return $item->user_id === $userId
                    && $item->location_type === $locationType
                    && $item->location_id === $locationId
                    && $item->slot === null;
            },
        ));
    }

    public function findByProduct(int $userId, int $productId): ?Item
    {
        foreach ($this->items as $item) {
            if ($item->user_id === $userId && $item->product_id === $productId) {
                return $item;
            }
        }

        return null;
    }

    public function insert(Item $item): int|false
    {
        $id = $this->nextId++;
        $now = Date::now();

        // Item has readonly id — we need to reconstruct with ID set
        $item = Item::fromData(array_merge($item->toArray(), [
            'id' => $id,
            'created_at' => $now,
            'updated_at' => $now,
        ]));
        $item->syncOriginal();

        $this->items[$id] = $item;

        return $id;
    }

    public function update(Item $item): bool
    {
        if (!isset($this->items[$item->id])) {
            return false;
        }

        $item->updated_at = Date::now();
        $this->items[$item->id] = $item;
        $item->syncOriginal();

        return true;
    }

    public function delete(int $id): bool
    {
        if (!isset($this->items[$id])) {
            return false;
        }

        unset($this->items[$id]);

        return true;
    }

    /**
     * Find fitted items (non-null slot) at a ship, regardless of user.
     *
     * Used by MemoryLoadoutFactory::build() which needs to query by
     * location only, matching the raw SQL in WpdbLoadoutFactory.
     *
     * @return array<Item>
     */
    public function findFittedAtShip(int $shipPostId): array
    {
        return array_values(array_filter(
            $this->items,
            static fn (Item $item) => $item->location_type === LocationType::Ship
                && $item->location_id === $shipPostId
                && $item->slot !== null,
        ));
    }
}
