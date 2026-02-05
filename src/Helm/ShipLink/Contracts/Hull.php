<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Hull system contract.
 *
 * Hull integrity represents structural damage. Unlike shields and power,
 * hull does not regenerate - it must be repaired.
 *
 * This is a read-only interface - Ship is responsible for all mutations.
 */
interface Hull
{
    /**
     * Get current hull integrity.
     */
    public function getIntegrity(): float;

    /**
     * Get maximum hull integrity.
     */
    public function getMaxIntegrity(): float;

    /**
     * Get integrity as percentage (0.0 - 1.0).
     */
    public function getIntegrityPercent(): float;

    /**
     * Check if hull is destroyed (integrity <= 0).
     */
    public function isDestroyed(): bool;

    /**
     * Check if hull is critical (below threshold).
     */
    public function isCritical(float $threshold = 0.25): bool;

    /**
     * Calculate new integrity after taking damage.
     *
     * @param float $amount Damage amount
     * @return float New integrity value (clamped to 0)
     */
    public function calculateIntegrityAfterDamage(float $amount): float;

    /**
     * Calculate new integrity after repair.
     *
     * @param float $amount Repair amount
     * @return float New integrity value (clamped to max)
     */
    public function calculateIntegrityAfterRepair(float $amount): float;
}
