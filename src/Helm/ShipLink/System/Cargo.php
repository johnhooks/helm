<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\Inventory\InventoryRepository;
use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;
use Helm\Products\ProductRepository;
use Helm\ShipLink\Contracts\Cargo as CargoContract;

/**
 * Cargo system implementation.
 *
 * Manages the ship's cargo hold using the inventory system.
 * Resources are stored as inventory items with location_type=Ship, slot=NULL.
 */
final class Cargo implements CargoContract
{
    public function __construct(
        private InventoryRepository $inventoryRepository,
        private ProductRepository $productRepository,
        private int $shipPostId,
        private int $ownerId,
    ) {
    }

    public function quantity(string $resourceSlug): int
    {
        $item = $this->findBySlug($resourceSlug);
        return $item?->quantity ?? 0;
    }

    public function all(): array
    {
        $items = $this->getCargoItems();

        if ($items === []) {
            return [];
        }

        // Batch load all products in one query
        $productIds = array_map(fn (Item $item) => $item->product_id, $items);
        $products = $this->productRepository->findByIds($productIds);

        $cargo = [];
        foreach ($items as $item) {
            $product = $products[$item->product_id] ?? null;
            if ($product !== null) {
                $cargo[$product->slug] = $item->quantity;
            }
        }

        return $cargo;
    }

    public function total(): int
    {
        $items = $this->getCargoItems();
        return array_sum(array_map(fn (Item $item) => $item->quantity, $items));
    }

    public function has(string $resourceSlug, int $quantity): bool
    {
        return $this->quantity($resourceSlug) >= $quantity;
    }

    public function isEmpty(): bool
    {
        return $this->getCargoItems() === [];
    }

    public function add(string $resourceSlug, int $quantity): int
    {
        $product = $this->productRepository->findBySlug($resourceSlug);
        if ($product === null) {
            throw new \InvalidArgumentException("Unknown resource: {$resourceSlug}");
        }

        $item = $this->findByProductId($product->id);

        if ($item !== null) {
            // Update existing
            $item->quantity += $quantity;
            $this->inventoryRepository->update($item);
            return $item->quantity;
        }

        // Create new
        $item = new Item([
            'user_id' => $this->ownerId,
            'product_id' => $product->id,
            'location_type' => LocationType::Ship,
            'location_id' => $this->shipPostId,
            'slot' => null,
            'quantity' => $quantity,
        ]);
        $this->inventoryRepository->insert($item);

        return $quantity;
    }

    public function remove(string $resourceSlug, int $quantity): int
    {
        $item = $this->findBySlug($resourceSlug);
        if ($item === null) {
            return 0;
        }

        $removed = min($item->quantity, $quantity);

        if ($removed >= $item->quantity) {
            // Remove entirely
            $this->inventoryRepository->delete($item->id);
        } else {
            // Reduce quantity
            $item->quantity -= $removed;
            $this->inventoryRepository->update($item);
        }

        return $removed;
    }

    /**
     * Get all cargo items (resources on ship, not fitted).
     *
     * @return array<Item>
     */
    private function getCargoItems(): array
    {
        return $this->inventoryRepository->findAllCargoAtLocation(
            $this->ownerId,
            LocationType::Ship,
            $this->shipPostId,
            'resource'
        );
    }

    /**
     * Find a cargo item by resource slug.
     */
    private function findBySlug(string $resourceSlug): ?Item
    {
        $product = $this->productRepository->findBySlug($resourceSlug);
        if ($product === null) {
            return null;
        }

        return $this->findByProductId($product->id);
    }

    /**
     * Find a cargo item by product ID.
     */
    private function findByProductId(int $productId): ?Item
    {
        return $this->inventoryRepository->findCargoAtLocation(
            $this->ownerId,
            'resource',
            $productId,
            LocationType::Ship,
            $this->shipPostId
        );
    }
}
