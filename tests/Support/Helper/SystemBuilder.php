<?php

declare(strict_types=1);

namespace Tests\Support\Helper;

use DateTimeImmutable;
use Helm\Inventory\LocationType;
use Helm\Inventory\Models\Item;
use Helm\Products\Contracts\ProductRepository;
use Helm\Products\Models\Product;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\FittedComponent;
use Helm\ShipLink\Loadout;
use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\ShipFittingSlot;
use Helm\ShipLink\System\Power;
use Helm\ShipLink\System\Propulsion;
use Helm\ShipLink\System\Sensors;
use Helm\ShipLink\System\Shields;

/**
 * Builds ship system objects from fixture data.
 *
 * Used by ContractTest to create PHP system instances from the shared
 * JSON fixtures, allowing the same test cases to run in both PHP and TS.
 */
final class SystemBuilder
{
    private int $nextItemId = 1;

    public function __construct(
        private readonly ProductRepository $products,
    ) {
    }

    public function buildShipState(array $fixture): ShipState
    {
        $s = $fixture['state'] ?? [];

        $data = [
            'ship_post_id' => 1,
            'power_max' => (float) ($s['power_max'] ?? 100.0),
            'shields_max' => (float) ($s['shields_max'] ?? 100.0),
            'hull_integrity' => (float) ($s['hull_integrity'] ?? 100.0),
            'hull_max' => (float) ($s['hull_max'] ?? 100.0),
        ];

        if (isset($s['power_mode'])) {
            $mode = PowerMode::fromSlug($s['power_mode']);
            if ($mode === null) {
                throw new \RuntimeException("Unknown power mode: {$s['power_mode']}");
            }
            $data['power_mode'] = $mode;
        }

        if (array_key_exists('power_full_at', $s)) {
            $data['power_full_at'] = self::toDateTime($s['power_full_at']);
        }

        if (array_key_exists('shields_full_at', $s)) {
            $data['shields_full_at'] = self::toDateTime($s['shields_full_at']);
        }

        return new ShipState($data);
    }

    public function buildLoadout(array $fixture): Loadout
    {
        $slugs = $fixture['loadout'] ?? [];

        $slots = [];
        $slotMap = [
            'core' => ShipFittingSlot::Core,
            'drive' => ShipFittingSlot::Drive,
            'sensor' => ShipFittingSlot::Sensor,
            'shield' => ShipFittingSlot::Shield,
            'nav' => ShipFittingSlot::Nav,
        ];

        foreach ($slotMap as $key => $slot) {
            $slug = $slugs[$key] ?? null;
            if ($slug === null) {
                // Use defaults for missing slots
                $slug = match ($key) {
                    'core' => 'epoch_s',
                    'drive' => 'dr_505',
                    'sensor' => 'vrs_mk1',
                    'shield' => 'aegis_delta',
                    'nav' => 'nav_tier_1',
                };
            }

            $product = $this->products->findBySlug($slug);
            if ($product === null) {
                throw new \RuntimeException("Product not found: {$slug}");
            }

            $slots[$slot->value] = $this->makeFitted($product, $slot);
        }

        return new Loadout($slots);
    }

    public function buildPower(array $fixture): Power
    {
        return new Power(
            $this->buildShipState($fixture),
            $this->buildLoadout($fixture),
        );
    }

    public function buildShields(array $fixture): Shields
    {
        return new Shields(
            $this->buildShipState($fixture),
            $this->buildLoadout($fixture),
        );
    }

    public function buildPropulsion(array $fixture): Propulsion
    {
        $state = $this->buildShipState($fixture);
        $loadout = $this->buildLoadout($fixture);
        $power = new Power($state, $loadout);

        return new Propulsion($loadout, $power);
    }

    public function buildSensors(array $fixture): Sensors
    {
        $state = $this->buildShipState($fixture);
        $loadout = $this->buildLoadout($fixture);
        $power = new Power($state, $loadout);

        return new Sensors($loadout, $power);
    }

    private function makeFitted(Product $product, ShipFittingSlot $slot): FittedComponent
    {
        $item = new Item([
            'id' => $this->nextItemId++,
            'user_id' => 1,
            'product_id' => $product->id,
            'location_type' => LocationType::Ship,
            'location_id' => 1,
            'slot' => $slot->value,
            'quantity' => 1,
            'life' => $product->hp,
            'usage_count' => 0,
        ]);

        return new FittedComponent($item, $product);
    }

    private static function toDateTime(?int $timestamp): ?DateTimeImmutable
    {
        if ($timestamp === null) {
            return null;
        }

        $dt = DateTimeImmutable::createFromFormat('U', (string) $timestamp);
        if ($dt === false) {
            throw new \RuntimeException("Invalid timestamp: {$timestamp}");
        }

        return $dt;
    }
}
