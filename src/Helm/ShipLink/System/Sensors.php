<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\ShipLink\Contracts\PowerSystem;
use Helm\ShipLink\Contracts\Sensors as SensorsContract;
use Helm\ShipLink\Loadout;

/**
 * Sensor system implementation.
 *
 * Calculates scan range based on sensor specs and power output.
 *
 * This system is read-only - it reports state and calculates values.
 * Ship is responsible for all mutations to components.
 */
final class Sensors implements SensorsContract
{
    /**
     * Base power cost per light-year for route scans.
     */
    private const BASE_SCAN_POWER_PER_LY = 2.0;

    /**
     * Base power cost per hour for system surveys.
     */
    private const BASE_SURVEY_POWER_PER_HOUR = 10.0;

    /**
     * Base scan duration in seconds per light-year.
     */
    private const BASE_SCAN_SECONDS_PER_LY = 30;

    public function __construct(
        private Loadout $loadout,
        private PowerSystem $power,
    ) {
    }

    public function getRange(): float
    {
        // effectiveRange = baseRange × outputMultiplier
        return $this->getBaseRange() * $this->power->getOutputMultiplier();
    }

    public function getBaseRange(): float
    {
        return $this->loadout->sensor()->product()->range ?? 0.0;
    }

    public function canScan(float $distanceLy): bool
    {
        return $distanceLy <= $this->getRange();
    }

    public function getRouteScanCost(float $distanceLy): float
    {
        return $distanceLy * self::BASE_SCAN_POWER_PER_LY;
    }

    public function getSurveyCostPerHour(): float
    {
        return self::BASE_SURVEY_POWER_PER_HOUR;
    }

    public function getRouteScanDuration(float $distanceLy): int
    {
        $baseDuration = $distanceLy * self::BASE_SCAN_SECONDS_PER_LY;
        return (int) ceil($baseDuration * $this->getSurveyDurationMultiplier());
    }

    public function getSurveyDurationMultiplier(): float
    {
        return $this->loadout->sensor()->product()->mult_a ?? 0.0;
    }

    public function getScanSuccessChance(): float
    {
        return $this->loadout->sensor()->product()->chance ?? 0.0;
    }
}
