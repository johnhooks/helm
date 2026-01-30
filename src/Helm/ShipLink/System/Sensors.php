<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\ShipLink\Contracts\PowerMetrics;
use Helm\ShipLink\Contracts\Sensors as SensorsContract;
use Helm\ShipLink\ShipModel;

/**
 * Sensor system implementation.
 *
 * Calculates scan range based on sensor specs and power output.
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
        private ShipModel $model,
        private PowerMetrics $powerMetrics,
    ) {
    }

    public function getRange(): float
    {
        // effectiveRange = baseRange × outputMultiplier
        return $this->getBaseRange() * $this->getOutputMultiplier();
    }

    public function getBaseRange(): float
    {
        return $this->model->sensorType->range();
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
        return $this->model->sensorType->surveyDurationMultiplier();
    }

    public function getScanSuccessChance(): float
    {
        return $this->model->sensorType->scanSuccessChance();
    }

    /**
     * Get current power output multiplier.
     */
    private function getOutputMultiplier(): float
    {
        return $this->powerMetrics->getOutputMultiplier();
    }
}
