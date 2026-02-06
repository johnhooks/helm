<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Products\Models\Product;
use Helm\ShipLink\Models\ShipFitting;
use Helm\ShipLink\Models\ShipComponent;

/**
 * A component fully composed from its three table rows.
 *
 * Combines ShipComponent (instance), Product (catalog), and ShipFitting (slot)
 * into a single read-friendly object.
 */
final class FittedComponent
{
    public function __construct(
        private readonly ShipComponent $component,
        private readonly Product $product,
        private readonly ShipFitting $fitting,
    ) {
    }

    public function id(): int
    {
        return $this->component->id;
    }

    public function slot(): ShipFittingSlot
    {
        return $this->fitting->slot;
    }

    public function slug(): string
    {
        return $this->product->slug;
    }

    public function label(): string
    {
        return $this->product->label;
    }

    public function life(): ?int
    {
        return $this->component->life;
    }

    public function hp(): ?int
    {
        return $this->product->hp;
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
    public function component(): ShipComponent
    {
        return $this->component;
    }

    /**
     * Get the product (catalog row).
     */
    public function product(): Product
    {
        return $this->product;
    }

    /**
     * Get the fitting (pivot row).
     */
    public function fitting(): ShipFitting
    {
        return $this->fitting;
    }
}
