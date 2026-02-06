<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Inventory\Models\Item;

/**
 * Aggregates all fitted components for a ship, keyed by slot.
 *
 * The single point of access for component data within Ship and System classes.
 */
final class Loadout
{
    /** @var array<string, FittedComponent> */
    private array $slots;

    /**
     * @param array<string, FittedComponent> $slots Keyed by slot value string
     */
    public function __construct(array $slots)
    {
        $this->slots = $slots;
    }

    /**
     * @throws \RuntimeException If core slot is not fitted
     */
    public function core(): FittedComponent
    {
        return $this->requireSlot(ShipFittingSlot::Core);
    }

    /**
     * @throws \RuntimeException If drive slot is not fitted
     */
    public function drive(): FittedComponent
    {
        return $this->requireSlot(ShipFittingSlot::Drive);
    }

    /**
     * @throws \RuntimeException If sensor slot is not fitted
     */
    public function sensor(): FittedComponent
    {
        return $this->requireSlot(ShipFittingSlot::Sensor);
    }

    /**
     * @throws \RuntimeException If shield slot is not fitted
     */
    public function shield(): FittedComponent
    {
        return $this->requireSlot(ShipFittingSlot::Shield);
    }

    /**
     * @throws \RuntimeException If nav slot is not fitted
     */
    public function nav(): FittedComponent
    {
        return $this->requireSlot(ShipFittingSlot::Nav);
    }

    /**
     * Get equipment slots.
     *
     * @return array<FittedComponent>
     */
    public function equipment(): array
    {
        $equipment = [];

        foreach (ShipFittingSlot::equipment() as $slot) {
            $key = $slot->value;
            if (isset($this->slots[$key])) {
                $equipment[] = $this->slots[$key];
            }
        }

        return $equipment;
    }

    /**
     * Get a fitted component by slot, or null if empty.
     */
    public function slot(ShipFittingSlot|string $slot): ?FittedComponent
    {
        $key = $slot instanceof ShipFittingSlot ? $slot->value : $slot;
        return $this->slots[$key] ?? null;
    }

    /**
     * Total footprint of all fitted components (m^3).
     */
    public function totalFootprint(): int
    {
        $total = 0;

        foreach ($this->slots as $fitted) {
            $total += $fitted->product()->footprint;
        }

        return $total;
    }

    /**
     * Cargo capacity = frame capacity - total footprint.
     *
     * Pioneer frame = 300 m^3 internal space.
     */
    public function cargoCapacity(): int
    {
        return 300 - $this->totalFootprint();
    }

    /**
     * Get all component models that have been mutated.
     *
     * Used by the save path in ActionFactory/Resolver to persist changes.
     *
     * @return array<Item>
     */
    public function dirtyComponents(): array
    {
        $dirty = [];

        foreach ($this->slots as $fitted) {
            if ($fitted->component()->isDirty()) {
                $dirty[] = $fitted->component();
            }
        }

        return $dirty;
    }

    /**
     * Get a required slot, throwing if missing.
     *
     * @throws \RuntimeException
     */
    private function requireSlot(ShipFittingSlot $slot): FittedComponent
    {
        $key = $slot->value;
        if (!isset($this->slots[$key])) {
            throw new \RuntimeException("Required slot '{$key}' is not fitted");
        }

        return $this->slots[$key];
    }
}
