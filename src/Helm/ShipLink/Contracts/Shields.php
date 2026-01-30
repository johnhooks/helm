<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use DateTimeImmutable;

/**
 * Shield system contract.
 *
 * Shields are a regenerating defensive resource, using the same
 * "full_at" timestamp pattern as power.
 */
interface Shields
{
    /**
     * Get current shield strength.
     */
    public function getCurrentStrength(): float;

    /**
     * Get maximum shield capacity.
     */
    public function getMaxStrength(): float;

    /**
     * Get shield regeneration rate (units per hour).
     */
    public function getRegenRate(): float;

    /**
     * Consume shields (take damage).
     *
     * @return float Overflow damage that exceeded shields (0 if shields absorbed all).
     */
    public function absorb(float $damage): float;

    /**
     * Check if shields are depleted.
     */
    public function isDepleted(): bool;

    /**
     * Get timestamp when shields will be full.
     */
    public function getFullAt(): ?DateTimeImmutable;
}
