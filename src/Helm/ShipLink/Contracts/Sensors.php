<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Sensor system contract.
 *
 * Handles scanning: route discovery, system surveys, and detection.
 * Range is calculated from sensor specs and core output.
 */
interface Sensors
{
    /**
     * Get effective sensor range in light-years.
     *
     * Calculated from: baseRange × coreOutput
     */
    public function getRange(): float;

    /**
     * Get base sensor range before power scaling.
     */
    public function getBaseRange(): float;

    /**
     * Check if a target is within sensor range.
     */
    public function canScan(float $distanceLy): bool;

    /**
     * Get power cost for a route scan.
     */
    public function getRouteScanCost(float $distanceLy): float;

    /**
     * Get power cost for a system survey (per hour).
     */
    public function getSurveyCostPerHour(): float;

    /**
     * Get duration for a route scan in seconds.
     */
    public function getRouteScanDuration(float $distanceLy): int;

    /**
     * Get duration multiplier for system surveys.
     *
     * SR-H (High-res): 0.5x, SR-S (Standard): 1.0x, SR-L (Long-range): 2.0x
     */
    public function getSurveyDurationMultiplier(): float;

    /**
     * Get base success chance for route scanning.
     *
     * Higher quality sensors have better first-hop discovery rates.
     */
    public function getScanSuccessChance(): float;
}
