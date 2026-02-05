<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Cargo system contract.
 *
 * Manages the ship's cargo hold - resources collected, traded, or transported.
 *
 * This is a read-only interface - Ship is responsible for all mutations.
 */
interface Cargo
{
    /**
     * Get quantity of a specific resource.
     */
    public function quantity(string $resource): int;

    /**
     * Get all cargo contents.
     *
     * @return array<string, int>
     */
    public function all(): array;

    /**
     * Get total cargo weight/units.
     */
    public function total(): int;

    /**
     * Check if ship has at least this much of a resource.
     */
    public function has(string $resource, int $quantity): bool;

    /**
     * Check if cargo hold is empty.
     */
    public function isEmpty(): bool;

    /**
     * Calculate new cargo after adding resources.
     *
     * @param string $resource Resource type
     * @param int $quantity Amount to add
     * @return array<string, int> New cargo state
     */
    public function calculateCargoAfterAdd(string $resource, int $quantity): array;

    /**
     * Calculate new cargo after removing resources.
     *
     * @param string $resource Resource type
     * @param int $quantity Amount to remove
     * @return array{cargo: array<string, int>, removed: int} New cargo state and actual amount removed
     */
    public function calculateCargoAfterRemove(string $resource, int $quantity): array;
}
