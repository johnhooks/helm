<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Inventory\Models\Item;
use Helm\Products\Models\Product;

/**
 * A component fully composed from its two table rows.
 *
 * Combines Item (inventory instance with lifecycle) and Product (catalog)
 * into a single read-friendly object.
 */
final class FittedComponent
{
    public function __construct(
        private readonly Item $item,
        private readonly Product $product,
    ) {
    }

    public function id(): int
    {
        return $this->item->id;
    }

    public function slot(): ShipFittingSlot
    {
        return ShipFittingSlot::from($this->item->slot);
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
        return $this->item->life;
    }

    public function hp(): ?int
    {
        return $this->product->hp;
    }

    public function usageCount(): int
    {
        return $this->item->usage_count;
    }

    /**
     * Compute condition as life/hp.
     *
     * Returns 1.0 if hp is null (component doesn't track health).
     */
    public function condition(): float
    {
        if ($this->product->hp === null || $this->product->hp === 0) {
            return 1.0;
        }

        if ($this->item->life === null) {
            return 1.0;
        }

        return $this->item->life / $this->product->hp;
    }

    /**
     * Get the mutable component model.
     *
     * Ship uses this to apply mutations (e.g. decrement core life).
     */
    public function component(): Item
    {
        return $this->item;
    }

    /**
     * Get the product (catalog row).
     */
    public function product(): Product
    {
        return $this->product;
    }
}
