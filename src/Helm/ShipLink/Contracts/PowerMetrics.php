<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Read-only interface for power metrics.
 *
 * Provides other systems with power information without
 * allowing them to mutate power state.
 */
interface PowerMetrics
{
    /**
     * Get current output multiplier.
     *
     * This is the core's effective output, combining:
     * - Core type's base output
     * - Power mode multiplier (when implemented)
     *
     * Used by other systems to scale their capabilities.
     */
    public function getOutputMultiplier(): float;

    /**
     * Get power regeneration rate (units per hour).
     *
     * Useful for systems that need to calculate power balance
     * over time (e.g., sensors during long scans).
     */
    public function getRegenRate(): float;
}
