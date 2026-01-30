<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Propulsion system contract.
 *
 * Handles drive mechanics: jump duration, core stress, and range.
 */
interface Propulsion
{
    /**
     * Get jump duration in seconds for a given distance.
     */
    public function getJumpDuration(float $distanceLy): int;

    /**
     * Get the core decay multiplier for this drive.
     *
     * Higher values burn core life faster per jump.
     * DR-7 Boost: 1.5x, DR-5 Standard: 1.0x, DR-3 Economy: 0.75x
     */
    public function getCoreDecayMultiplier(): float;

    /**
     * Get the speed multiplier for this drive.
     *
     * Affects how long jumps take.
     * DR-7 Boost: 2.0x, DR-5 Standard: 1.0x, DR-3 Economy: 0.5x
     */
    public function getSpeedMultiplier(): float;

    /**
     * Get maximum jump range in light-years.
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
}
