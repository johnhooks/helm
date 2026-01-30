<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Hull system contract.
 *
 * Hull integrity represents structural damage. Unlike shields and power,
 * hull does not regenerate - it must be repaired.
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
     * Apply damage to hull.
     */
    public function damage(float $amount): void;

    /**
     * Repair hull (at station/with resources).
     */
    public function repair(float $amount): void;

    /**
     * Check if hull is destroyed (integrity <= 0).
     */
    public function isDestroyed(): bool;

    /**
     * Check if hull is critical (below threshold).
     */
    public function isCritical(float $threshold = 0.25): bool;
}
