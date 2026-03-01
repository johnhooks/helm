<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Database\Schema;
use Helm\Inventory\InventoryRepository;
use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;
use Helm\Products\Models\Product;
use Helm\Products\ProductRepository;
use Helm\StellarWP\Models\Model;

/**
 * Builds Loadout instances from database data.
 *
 * Replaces ShipSystemsRepository::findOrCreate() as the way to
 * get component data for a ship.
 */
final class LoadoutFactory
{
    public function __construct(
        private readonly ProductRepository $productRepository,
        private readonly InventoryRepository $inventoryRepository,
    ) {
    }

    /**
     * Build a Loadout for an existing ship.
     *
     * JOINs inventory + products in a single query,
     * then hydrates FittedComponent objects.
     */
    public function build(int $shipPostId): Loadout
    {
        global $wpdb;

        $inventoryTable = $wpdb->prefix . Schema::TABLE_INVENTORY;
        $productsTable = $wpdb->prefix . Schema::TABLE_PRODUCTS;

        // Query fitted items (slot IS NOT NULL) for this ship
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT
                    i.id AS i_id, i.user_id, i.product_id AS i_product_id, i.location_type,
                    i.location_id, i.slot, i.quantity, i.life, i.usage_count, i.meta,
                    i.created_at AS i_created_at, i.updated_at AS i_updated_at,
                    p.id AS p_id, p.slug, p.type, p.label, p.version, p.hp,
                    p.footprint, p.rate, p.`range`, p.capacity, p.chance,
                    p.mult_a, p.mult_b, p.mult_c,
                    p.created_at AS p_created_at, p.updated_at AS p_updated_at
                FROM {$inventoryTable} i
                JOIN {$productsTable} p ON p.id = i.product_id
                WHERE i.location_type = %d AND i.location_id = %d AND i.slot IS NOT NULL",
                LocationType::Ship->value,
                $shipPostId
            ),
            ARRAY_A
        );

        $slots = [];

        foreach ($rows as $row) {
            $item = Item::fromData([
                'id' => $row['i_id'],
                'user_id' => $row['user_id'],
                'product_id' => $row['i_product_id'],
                'location_type' => $row['location_type'],
                'location_id' => $row['location_id'],
                'slot' => $row['slot'],
                'quantity' => $row['quantity'],
                'life' => $row['life'],
                'usage_count' => $row['usage_count'],
                'meta' => $row['meta'],
                'created_at' => $row['i_created_at'],
                'updated_at' => $row['i_updated_at'],
            ], Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);
            $item->syncOriginal();

            $product = Product::fromData([
                'id' => $row['p_id'],
                'slug' => $row['slug'],
                'type' => $row['type'],
                'label' => $row['label'],
                'version' => $row['version'],
                'hp' => $row['hp'],
                'footprint' => $row['footprint'],
                'rate' => $row['rate'],
                'range' => $row['range'],
                'capacity' => $row['capacity'],
                'chance' => $row['chance'],
                'mult_a' => $row['mult_a'],
                'mult_b' => $row['mult_b'],
                'mult_c' => $row['mult_c'],
                'created_at' => $row['p_created_at'],
                'updated_at' => $row['p_updated_at'],
            ], Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);
            $product->syncOriginal();

            $slots[$row['slot']] = new FittedComponent($item, $product);
        }

        return new Loadout($slots);
    }

    /**
     * Create default components and inventory items for a new ship.
     *
     * Standard starter loadout: Epoch-S, DR-505, VRS Mk I, Aegis Delta, Nav Tier 1.
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

            // Create inventory item with lifecycle data inline
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

            // Refetch to get the item with ID set
            $item = $this->inventoryRepository->find($itemId);
            if ($item === null) {
                throw new \RuntimeException("Failed to find inserted inventory item: {$itemId}");
            }

            $slots[$slot] = new FittedComponent($item, $product);
        }

        return new Loadout($slots);
    }
}
