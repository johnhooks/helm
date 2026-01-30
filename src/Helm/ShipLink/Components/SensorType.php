<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Sensor types.
 *
 * Sensors determine:
 * - Scan range (how far you can scan)
 * - Survey duration multiplier (resolution vs range tradeoff)
 * - Scan success chance
 */
enum SensorType: int
{
    case SRL = 1;  // Long-range
    case SRS = 2;  // Standard
    case SRH = 3;  // High-resolution

    public function slug(): string
    {
        return match ($this) {
            self::SRL => 'sr_l',
            self::SRS => 'sr_s',
            self::SRH => 'sr_h',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::SRL => __('SR-L Long-Range', 'helm'),
            self::SRS => __('SR-S Standard', 'helm'),
            self::SRH => __('SR-H High-Resolution', 'helm'),
        };
    }

    /**
     * Scan range in light-years.
     */
    public function range(): float
    {
        return match ($this) {
            self::SRL => 20.0,
            self::SRS => 12.0,
            self::SRH => 6.0,
        };
    }

    /**
     * Survey duration multiplier (lower = faster surveys).
     */
    public function surveyDurationMultiplier(): float
    {
        return match ($this) {
            self::SRL => 2.0,
            self::SRS => 1.0,
            self::SRH => 0.5,
        };
    }

    /**
     * Base scan success chance (0.0 - 1.0).
     */
    public function scanSuccessChance(): float
    {
        return match ($this) {
            self::SRL => 0.6,
            self::SRS => 0.7,
            self::SRH => 0.85,
        };
    }
}
