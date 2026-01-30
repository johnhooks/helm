<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Warp core types.
 *
 * Cores determine:
 * - Total jump capacity (core life in light-years)
 * - Power regeneration rate
 * - Jump cost multiplier
 */
enum CoreType: int
{
    case EpochE = 1;  // Endurance
    case EpochS = 2;  // Standard
    case EpochR = 3;  // Rapid

    public function slug(): string
    {
        return match ($this) {
            self::EpochE => 'epoch_e',
            self::EpochS => 'epoch_s',
            self::EpochR => 'epoch_r',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::EpochE => __('Epoch-E Endurance', 'helm'),
            self::EpochS => __('Epoch-S Standard', 'helm'),
            self::EpochR => __('Epoch-R Rapid', 'helm'),
        };
    }

    /**
     * Core life capacity in light-years.
     */
    public function coreLife(): float
    {
        return match ($this) {
            self::EpochE => 1000.0,
            self::EpochS => 750.0,
            self::EpochR => 500.0,
        };
    }

    /**
     * Power regeneration rate (units per hour).
     */
    public function regenRate(): float
    {
        return match ($this) {
            self::EpochE => 5.0,
            self::EpochS => 10.0,
            self::EpochR => 20.0,
        };
    }

    /**
     * Jump cost multiplier.
     */
    public function jumpCostMultiplier(): float
    {
        return match ($this) {
            self::EpochE => 0.75,
            self::EpochS => 1.0,
            self::EpochR => 1.5,
        };
    }

    /**
     * Base output multiplier.
     *
     * This is the core's inherent output capacity, modified by PowerMode.
     * Currently returns 1.0 - will be enhanced when PowerMode is implemented.
     *
     * Effective output = baseOutput × powerMode.outputMultiplier
     */
    public function baseOutput(): float
    {
        return match ($this) {
            self::EpochE => 0.9,   // Conservative output, longer life
            self::EpochS => 1.0,   // Baseline
            self::EpochR => 1.1,   // Higher output, faster decay
        };
    }
}
