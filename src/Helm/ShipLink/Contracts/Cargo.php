<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Cargo system contract.
 *
 * Manages the ship's cargo hold - resources collected, traded, or transported.
 * Cargo is stored in inventory (location_type=Ship, slot=NULL).
 */
interface Cargo
{
    /**
     * Get quantity of a specific resource by slug.
     */
    public function quantity(string $resourceSlug): int;

    /**
     * Get all cargo contents.
     *
     * @return array<string, int> Map of resource slug => quantity
     */
    public function all(): array;

    /**
     * Get total cargo weight/units.
     */
    public function total(): int;

    /**
     * Check if ship has at least this much of a resource.
     */
    public function has(string $resourceSlug, int $quantity): bool;

    /**
     * Check if cargo hold is empty.
     */
    public function isEmpty(): bool;

    /**
     * Add resources to cargo.
     *
     * @param string $resourceSlug Resource product slug
     * @param int $quantity Amount to add
     * @return int New total quantity of this resource
     */
    public function add(string $resourceSlug, int $quantity): int;

    /**
     * Remove resources from cargo.
     *
     * @param string $resourceSlug Resource product slug
     * @param int $quantity Amount to remove (will not go below 0)
     * @return int Amount actually removed
     */
    public function remove(string $resourceSlug, int $quantity): int;
}
