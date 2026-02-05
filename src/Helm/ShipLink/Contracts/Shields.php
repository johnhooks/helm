<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use DateTimeImmutable;

/**
 * Shield system contract.
 *
 * Shields are a regenerating defensive resource, using the same
 * "full_at" timestamp pattern as power.
 *
 * This is a read-only interface - Ship is responsible for all mutations.
 */
interface Shields
{
    /**
     * Get current shield strength.
     */
    public function getCurrentStrength(?DateTimeImmutable $now = null): float;

    /**
     * Get maximum shield capacity.
     */
    public function getMaxStrength(): float;

    /**
     * Get shield regeneration rate (units per hour).
     */
    public function getRegenRate(): float;

    /**
     * Check if shields are depleted.
     */
    public function isDepleted(): bool;

    /**
     * Get timestamp when shields will be full.
     */
    public function getFullAt(): ?DateTimeImmutable;

    /**
     * Calculate what shieldsFullAt should be after taking damage.
     *
     * Used by Ship to determine the new timestamp when mutating.
     *
     * @param float $amount Damage to absorb
     * @param DateTimeImmutable|null $now Current time (defaults to now)
     * @return DateTimeImmutable New shieldsFullAt value
     */
    public function calculateShieldsFullAtAfterDamage(float $amount, ?DateTimeImmutable $now = null): DateTimeImmutable;

    /**
     * Calculate how much damage shields can absorb.
     *
     * @param float $damage Incoming damage
     * @param DateTimeImmutable|null $now Current time (defaults to now)
     * @return array{absorbed: float, overflow: float} Amount absorbed and overflow
     */
    public function calculateDamageAbsorption(float $damage, ?DateTimeImmutable $now = null): array;
}
