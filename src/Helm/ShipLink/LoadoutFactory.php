<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Database\Schema;
use Helm\ShipLink\Models\Fitting;
use Helm\ShipLink\Models\ShipSystem;
use Helm\ShipLink\Models\SystemType;
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
        private readonly SystemTypeRepository $systemTypeRepository,
        private readonly ShipSystemRepository $shipSystemRepository,
        private readonly FittingRepository $fittingRepository,
    ) {
    }

    /**
     * Build a Loadout for an existing ship.
     *
     * JOINs fittings + ship_systems + system_types in a single query,
     * then hydrates FittedSystem objects.
     */
    public function build(int $shipPostId): Loadout
    {
        global $wpdb;

        $fittingsTable = $wpdb->prefix . Schema::TABLE_SHIP_FITTINGS;
        $systemsTable = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;
        $typesTable = $wpdb->prefix . Schema::TABLE_SYSTEM_TYPES;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT
                    f.ship_post_id, f.system_id, f.slot, f.installed_at,
                    s.id AS s_id, s.type_id, s.life, s.usage_count, s.`condition`,
                    s.created_by, s.owner_history, s.origin, s.origin_ref,
                    s.created_at AS s_created_at, s.updated_at AS s_updated_at,
                    t.id AS t_id, t.slug, t.type, t.label, t.version, t.hp,
                    t.footprint, t.rate, t.`range`, t.capacity, t.chance,
                    t.mult_a, t.mult_b, t.mult_c,
                    t.created_at AS t_created_at, t.updated_at AS t_updated_at
                FROM {$fittingsTable} f
                JOIN {$systemsTable} s ON s.id = f.system_id
                JOIN {$typesTable} t ON t.id = s.type_id
                WHERE f.ship_post_id = %d",
                $shipPostId
            ),
            ARRAY_A
        );

        $slots = [];

        foreach ($rows as $row) {
            $fitting = Fitting::fromData([
                'ship_post_id' => $row['ship_post_id'],
                'system_id' => $row['system_id'],
                'slot' => $row['slot'],
                'installed_at' => $row['installed_at'],
            ], Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);
            $fitting->syncOriginal();

            $component = ShipSystem::fromData([
                'id' => $row['s_id'],
                'type_id' => $row['type_id'],
                'life' => $row['life'],
                'usage_count' => $row['usage_count'],
                'condition' => $row['condition'],
                'created_by' => $row['created_by'],
                'owner_history' => $row['owner_history'],
                'origin' => $row['origin'],
                'origin_ref' => $row['origin_ref'],
                'created_at' => $row['s_created_at'],
                'updated_at' => $row['s_updated_at'],
            ], Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);
            $component->syncOriginal();

            $systemType = SystemType::fromData([
                'id' => $row['t_id'],
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
                'created_at' => $row['t_created_at'],
                'updated_at' => $row['t_updated_at'],
            ], Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);
            $systemType->syncOriginal();

            $slots[$row['slot']] = new FittedSystem($component, $systemType, $fitting);
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
            FittingSlot::Core->value => 'epoch_s',
            FittingSlot::Drive->value => 'dr_505',
            FittingSlot::Sensor->value => 'vrs_mk1',
            FittingSlot::Shield->value => 'aegis_beta',
            FittingSlot::Nav->value => 'nav_tier_1',
        ];

        $slots = [];

        foreach ($defaults as $slot => $slug) {
            $fittingSlot = FittingSlot::from($slot);
            $systemType = $this->systemTypeRepository->findBySlug($slug);
            if ($systemType === null) {
                throw new \RuntimeException("System type not found: {$slug}");
            }

            $component = new ShipSystem([
                'type_id' => $systemType->id,
                'life' => $systemType->hp,
                'created_by' => $ownerId,
                'origin' => 'starter',
            ]);
            $componentId = $this->shipSystemRepository->insert($component);
            if ($componentId === false) {
                throw new \RuntimeException("Failed to insert component for slot: {$slot}");
            }

            // Refetch to get the component with ID set
            $component = $this->shipSystemRepository->find($componentId);
            if ($component === null) {
                throw new \RuntimeException("Failed to find inserted component: {$componentId}");
            }

            $fitting = new Fitting([
                'ship_post_id' => $shipPostId,
                'system_id' => $component->id,
                'slot' => $fittingSlot,
            ]);
            $this->fittingRepository->install($fitting);

            $slots[$slot] = new FittedSystem($component, $systemType, $fitting);
        }

        return new Loadout($slots);
    }
}
