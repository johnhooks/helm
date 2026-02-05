<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\ShipLink\Contracts\PowerSystem;
use Helm\ShipLink\Contracts\Propulsion as PropulsionContract;
use Helm\ShipLink\Models\ShipSystems;

/**
 * Propulsion system implementation.
 *
 * Calculates jump range and duration based on drive specs and power output.
 * No hard-coded limits - range emerges from the power economics.
 *
 * This system is read-only - it reports state and calculates values.
 * Ship is responsible for all mutations to ShipSystems.
 */
final class Propulsion implements PropulsionContract
{
    /**
     * Base jump duration in seconds per light-year at 1.0x amplitude.
     */
    private const BASE_SECONDS_PER_LY = 3600;

    public function __construct(
        private ShipSystems $systems,
        private PowerSystem $power,
    ) {
    }

    public function getJumpDuration(float $distanceLy): int
    {
        $effectiveAmplitude = $this->getEffectiveAmplitude();
        $baseDuration = $distanceLy * self::BASE_SECONDS_PER_LY;

        // Higher amplitude = shorter duration
        return (int) ceil($baseDuration / $effectiveAmplitude);
    }

    public function getCoreDecayMultiplier(): float
    {
        return $this->systems->drive_type->consumption();
    }

    public function getMaxRange(): float
    {
        // maxRange = sustain × outputMultiplier × performanceRatio
        return $this->getSustain()
            * $this->power->getOutputMultiplier()
            * $this->getPerformanceRatio();
    }

    public function canReach(float $distanceLy): bool
    {
        return $distanceLy <= $this->getMaxRange();
    }

    public function calculateCoreCost(float $distanceLy): float
    {
        // Core cost = distance × core type multiplier × drive consumption
        return $distanceLy
            * $this->systems->core_type->jumpCostMultiplier()
            * $this->getCoreDecayMultiplier();
    }

    public function getPerformanceRatio(): float
    {
        // performanceRatio = min(1.0, outputMultiplier / consumption)
        // When underpowered, drive underperforms
        $ratio = $this->power->getOutputMultiplier() / $this->getConsumption();
        return min(1.0, $ratio);
    }

    public function getSustain(): float
    {
        return $this->systems->drive_type->sustain();
    }

    public function getConsumption(): float
    {
        return $this->systems->drive_type->consumption();
    }

    /**
     * Get effective amplitude (speed) accounting for power.
     *
     * effectiveAmplitude = baseAmplitude × outputMultiplier × performanceRatio
     */
    private function getEffectiveAmplitude(): float
    {
        return $this->systems->drive_type->amplitude()
            * $this->power->getOutputMultiplier()
            * $this->getPerformanceRatio();
    }
}
