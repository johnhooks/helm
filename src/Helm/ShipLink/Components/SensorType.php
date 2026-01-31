<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Sensor types.
 *
 * Different manufacturers optimize for different use cases:
 * - DSC (DeepScan): Long-range detection, slower surveys
 * - VRS (Versa): Balanced all-rounder
 * - ACU (Acuity): High-resolution, precise but short range
 */
enum SensorType: int
{
    case DSC = 1;  // DeepScan - Long-range
    case VRS = 2;  // Versa - Standard
    case ACU = 3;  // Acuity - High-resolution

    public function slug(): string
    {
        return match ($this) {
            self::DSC => 'dsc',
            self::VRS => 'vrs',
            self::ACU => 'acu',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::DSC => __('DSC Mk I', 'helm'),
            self::VRS => __('VRS Mk I', 'helm'),
            self::ACU => __('ACU Mk I', 'helm'),
        };
    }

    /**
     * Scan range in light-years.
     */
    public function range(): float
    {
        return match ($this) {
            self::DSC => 7.0,
            self::VRS => 5.0,
            self::ACU => 3.0,
        };
    }

    /**
     * Survey duration multiplier (lower = faster surveys).
     */
    public function surveyDurationMultiplier(): float
    {
        return match ($this) {
            self::DSC => 2.0,
            self::VRS => 1.0,
            self::ACU => 0.5,
        };
    }

    /**
     * Base scan success chance (0.0 - 1.0).
     */
    public function scanSuccessChance(): float
    {
        return match ($this) {
            self::DSC => 0.6,
            self::VRS => 0.7,
            self::ACU => 0.85,
        };
    }
}
