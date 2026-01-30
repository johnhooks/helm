<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Propulsion system contract.
 *
 * Handles drive mechanics: jump duration, core stress, and range.
 * Range and speed are calculated from drive specs and core output.
 */
interface Propulsion
{
    /**
     * Get jump duration in seconds for a given distance.
     *
     * Duration = (distance × BASE_SECONDS_PER_LY) / effectiveAmplitude
     */
    public function getJumpDuration(float $distanceLy): int;

    /**
     * Get the core decay multiplier for this drive.
     *
     * Higher values burn core life faster per jump.
     */
    public function getCoreDecayMultiplier(): float;

    /**
     * Get maximum jump range in light-years.
     *
     * Calculated from: sustain × coreOutput × performanceRatio
     */
    public function getMaxRange(): float;

    /**
     * Check if a destination is within jump range.
     */
    public function canReach(float $distanceLy): bool;

    /**
     * Calculate core life cost for a jump.
     */
    public function calculateCoreCost(float $distanceLy): float;

    /**
     * Get the drive's performance ratio based on current power.
     *
     * performanceRatio = min(1.0, coreOutput / consumption)
     * When underpowered (ratio < 1.0), drive underperforms.
     */
    public function getPerformanceRatio(): float;

    /**
     * Get the drive's base sustain (max distance at full performance).
     */
    public function getSustain(): float;

    /**
     * Get the drive's consumption factor.
     */
    public function getConsumption(): float;
}
