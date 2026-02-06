<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\ShipLink\Models\Fitting;
use Helm\ShipLink\Models\ShipSystem;
use Helm\ShipLink\Models\SystemType;

/**
 * A component fully composed from its three table rows.
 *
 * Combines ShipSystem (instance), SystemType (catalog), and Fitting (slot)
 * into a single read-friendly object.
 */
final class FittedSystem
{
    public function __construct(
        private readonly ShipSystem $component,
        private readonly SystemType $systemType,
        private readonly Fitting $fitting,
    ) {
    }

    public function id(): int
    {
        return $this->component->id;
    }

    public function slot(): FittingSlot
    {
        return $this->fitting->slot;
    }

    public function slug(): string
    {
        return $this->systemType->slug;
    }

    public function label(): string
    {
        return $this->systemType->label;
    }

    public function life(): ?int
    {
        return $this->component->life;
    }

    public function hp(): ?int
    {
        return $this->systemType->hp;
    }

    public function usageCount(): int
    {
        return $this->component->usage_count;
    }

    public function condition(): float
    {
        return $this->component->condition;
    }

    /**
     * Get the mutable component model.
     *
     * Ship uses this to apply mutations (e.g. decrement core life).
     */
    public function component(): ShipSystem
    {
        return $this->component;
    }

    /**
     * Get the system type (catalog row).
     */
    public function type(): SystemType
    {
        return $this->systemType;
    }

    /**
     * Get the fitting (pivot row).
     */
    public function fitting(): Fitting
    {
        return $this->fitting;
    }
}
