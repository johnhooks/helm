<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;
use Helm\Products\Contracts\ProductRepository;
use Helm\ShipLink\Contracts\LoadoutFactory;
use Helm\ShipLink\FittedComponent;
use Helm\ShipLink\Loadout;
use Helm\ShipLink\ShipFittingSlot;

/**
 * Builds Loadout instances from in-memory repositories.
 *
 * Replaces the raw $wpdb JOIN query in WpdbLoadoutFactory
 * by composing from InventoryRepository + ProductRepository.
 */
final class MemoryLoadoutFactory implements LoadoutFactory
{
    public function __construct(
        private readonly ProductRepository $productRepository,
        private readonly InventoryRepository $inventoryRepository,
    ) {
    }

    /**
     * Build a Loadout by querying fitted items from inventory.
     *
     * Finds all items at (Ship, $shipPostId) with a non-null slot,
     * looks up their products, and assembles the Loadout.
     */
    public function build(int $shipPostId): Loadout
    {
        // We need to scan all items at this ship location regardless of userId.
        // The in-memory inventory is small enough to iterate.
        $slots = [];

        foreach ($this->allFittedAtShip($shipPostId) as $item) {
            $product = $this->productRepository->find($item->product_id);
            if ($product !== null && $item->slot !== null) {
                $slots[$item->slot] = new FittedComponent($item, $product);
            }
        }

        return new Loadout($slots);
    }

    /**
     * Create default components and inventory items for a new ship.
     *
     * Same logic as WpdbLoadoutFactory::buildDefaults() — uses the
     * repository contracts so it works with in-memory storage.
     */
    public function buildDefaults(int $shipPostId, int $ownerId): Loadout
    {
        $defaults = [
            ShipFittingSlot::Core->value => 'epoch_s',
            ShipFittingSlot::Drive->value => 'dr_505',
            ShipFittingSlot::Sensor->value => 'vrs_mk1',
            ShipFittingSlot::Shield->value => 'aegis_delta',
            ShipFittingSlot::Nav->value => 'nav_tier_1',
        ];

        $slots = [];

        foreach ($defaults as $slot => $slug) {
            $product = $this->productRepository->findBySlug($slug);
            if ($product === null) {
                throw new \RuntimeException("Product not found: {$slug}");
            }

            $item = new Item([
                'user_id' => $ownerId,
                'product_id' => $product->id,
                'location_type' => LocationType::Ship,
                'location_id' => $shipPostId,
                'slot' => $slot,
                'life' => $product->hp,
                'usage_count' => 0,
                'meta' => [
                    'created_by' => $ownerId,
                    'origin' => 'starter',
                ],
            ]);
            $itemId = $this->inventoryRepository->insert($item);
            if ($itemId === false) {
                throw new \RuntimeException("Failed to insert inventory item for slot: {$slot}");
            }

            $item = $this->inventoryRepository->find($itemId);
            if ($item === null) {
                throw new \RuntimeException("Failed to find inserted inventory item: {$itemId}");
            }

            $slots[$slot] = new FittedComponent($item, $product);
        }

        return new Loadout($slots);
    }

    /**
     * Find all fitted items (non-null slot) on a ship, regardless of user.
     *
     * The contract's findAtLocation() requires userId, but build() only
     * knows shipPostId (matching WpdbLoadoutFactory's raw SQL). We use
     * the concrete MemoryInventoryRepository which provides a
     * simulation-only findFittedAtShip() method.
     *
     * @return array<Item>
     */
    private function allFittedAtShip(int $shipPostId): array
    {
        if ($this->inventoryRepository instanceof MemoryInventoryRepository) {
            return $this->inventoryRepository->findFittedAtShip($shipPostId);
        }

        throw new \RuntimeException('MemoryLoadoutFactory requires MemoryInventoryRepository');
    }
}
