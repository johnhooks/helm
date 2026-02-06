<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Database\Schema;
use Helm\Products\Models\Product;
use Helm\Products\ProductRepository;
use Helm\ShipLink\Models\ShipFitting;
use Helm\ShipLink\Models\ShipComponent;
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
        private readonly ShipComponentRepository $componentRepository,
        private readonly ShipFittingRepository $fittingRepository,
    ) {
    }

    /**
     * Build a Loadout for an existing ship.
     *
     * JOINs fittings + ship_components + products in a single query,
     * then hydrates FittedComponent objects.
     */
    public function build(int $shipPostId): Loadout
    {
        global $wpdb;

        $fittingsTable = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;
        $componentsTable = $wpdb->prefix . Schema::TABLE_SHIP_COMPONENTS;
        $productsTable = $wpdb->prefix . Schema::TABLE_PRODUCTS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT
                    f.ship_post_id, f.component_id, f.slot, f.installed_at,
                    c.id AS c_id, c.product_id, c.life, c.usage_count, c.`condition`,
                    c.created_by, c.owner_history, c.origin, c.origin_ref,
                    c.created_at AS c_created_at, c.updated_at AS c_updated_at,
                    p.id AS p_id, p.slug, p.type, p.label, p.version, p.hp,
                    p.footprint, p.rate, p.`range`, p.capacity, p.chance,
                    p.mult_a, p.mult_b, p.mult_c,
                    p.created_at AS p_created_at, p.updated_at AS p_updated_at
                FROM {$fittingsTable} f
                JOIN {$componentsTable} c ON c.id = f.component_id
                JOIN {$productsTable} p ON p.id = c.product_id
                WHERE f.ship_post_id = %d",
                $shipPostId
            ),
            ARRAY_A
        );

        $slots = [];

        foreach ($rows as $row) {
            $fitting = ShipFitting::fromData([
                'ship_post_id' => $row['ship_post_id'],
                'component_id' => $row['component_id'],
                'slot' => $row['slot'],
                'installed_at' => $row['installed_at'],
            ], Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);
            $fitting->syncOriginal();

            $component = ShipComponent::fromData([
                'id' => $row['c_id'],
                'product_id' => $row['product_id'],
                'life' => $row['life'],
                'usage_count' => $row['usage_count'],
                'condition' => $row['condition'],
                'created_by' => $row['created_by'],
                'owner_history' => $row['owner_history'],
                'origin' => $row['origin'],
                'origin_ref' => $row['origin_ref'],
                'created_at' => $row['c_created_at'],
                'updated_at' => $row['c_updated_at'],
            ], Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);
            $component->syncOriginal();

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

            $slots[$row['slot']] = new FittedComponent($component, $product, $fitting);
        }

        return new Loadout($slots);
    }

    /**
     * Create default components and fittings for a new ship.
     *
     * Standard starter loadout: Epoch-S, DR-505, VRS Mk I, Aegis Beta, Nav Tier 1.
     */
    public function buildDefaults(int $shipPostId, int $ownerId): Loadout
    {
        $defaults = [
            ShipFittingSlot::Core->value => 'epoch_s',
            ShipFittingSlot::Drive->value => 'dr_505',
            ShipFittingSlot::Sensor->value => 'vrs_mk1',
            ShipFittingSlot::Shield->value => 'aegis_beta',
            ShipFittingSlot::Nav->value => 'nav_tier_1',
        ];

        $slots = [];

        foreach ($defaults as $slot => $slug) {
            $fittingSlot = ShipFittingSlot::from($slot);
            $product = $this->productRepository->findBySlug($slug);
            if ($product === null) {
                throw new \RuntimeException("Product not found: {$slug}");
            }

            $component = new ShipComponent([
                'product_id' => $product->id,
                'life' => $product->hp,
                'created_by' => $ownerId,
                'origin' => 'starter',
            ]);
            $componentId = $this->componentRepository->insert($component);
            if ($componentId === false) {
                throw new \RuntimeException("Failed to insert component for slot: {$slot}");
            }

            // Refetch to get the component with ID set
            $component = $this->componentRepository->find($componentId);
            if ($component === null) {
                throw new \RuntimeException("Failed to find inserted component: {$componentId}");
            }

            $fitting = new ShipFitting([
                'ship_post_id' => $shipPostId,
                'component_id' => $component->id,
                'slot' => $fittingSlot,
            ]);
            $this->fittingRepository->install($fitting);

            $slots[$slot] = new FittedComponent($component, $product, $fitting);
        }

        return new Loadout($slots);
    }
}
