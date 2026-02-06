<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\ShipLink\Models\ShipSystem;

/**
 * Aggregates all fitted systems for a ship, keyed by slot.
 *
 * Replaces the old ShipSystems model as the single point of access
 * for component data within Ship and System classes.
 */
final class Loadout
{
    /** @var array<string, FittedSystem> */
    private array $slots;

    /**
     * @param array<string, FittedSystem> $slots Keyed by slot value string
     */
    public function __construct(array $slots)
    {
        $this->slots = $slots;
    }

    /**
     * @throws \RuntimeException If core slot is not fitted
     */
    public function core(): FittedSystem
    {
        return $this->requireSlot(FittingSlot::Core);
    }

    /**
     * @throws \RuntimeException If drive slot is not fitted
     */
    public function drive(): FittedSystem
    {
        return $this->requireSlot(FittingSlot::Drive);
    }

    /**
     * @throws \RuntimeException If sensor slot is not fitted
     */
    public function sensor(): FittedSystem
    {
        return $this->requireSlot(FittingSlot::Sensor);
    }

    /**
     * @throws \RuntimeException If shield slot is not fitted
     */
    public function shield(): FittedSystem
    {
        return $this->requireSlot(FittingSlot::Shield);
    }

    /**
     * @throws \RuntimeException If nav slot is not fitted
     */
    public function nav(): FittedSystem
    {
        return $this->requireSlot(FittingSlot::Nav);
    }

    /**
     * Get equipment slots.
     *
     * @return array<FittedSystem>
     */
    public function equipment(): array
    {
        $equipment = [];

        foreach (FittingSlot::equipment() as $slot) {
            $key = $slot->value;
            if (isset($this->slots[$key])) {
                $equipment[] = $this->slots[$key];
            }
        }

        return $equipment;
    }

    /**
     * Get a fitted system by slot, or null if empty.
     */
    public function slot(FittingSlot|string $slot): ?FittedSystem
    {
        $key = $slot instanceof FittingSlot ? $slot->value : $slot;
        return $this->slots[$key] ?? null;
    }

    /**
     * Total footprint of all fitted components (m^3).
     */
    public function totalFootprint(): int
    {
        $total = 0;

        foreach ($this->slots as $fitted) {
            $total += $fitted->type()->footprint;
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
     * @return array<ShipSystem>
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
    private function requireSlot(FittingSlot $slot): FittedSystem
    {
        $key = $slot->value;
        if (!isset($this->slots[$key])) {
            throw new \RuntimeException("Required slot '{$key}' is not fitted");
        }

        return $this->slots[$key];
    }
}
