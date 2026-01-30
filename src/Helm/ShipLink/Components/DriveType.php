<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Drive types.
 *
 * Drives determine:
 * - Sustain: Base maximum jump distance (range)
 * - Amplitude: Jump speed (how long travel takes)
 * - Consumption: Power appetite (affects performance when underpowered)
 *
 * The tradeoff: fast drives are hungry and have shorter range.
 * Efficient drives are slow but go farther.
 */
enum DriveType: int
{
    case DR3 = 1;  // Economy - long range, slow, efficient
    case DR5 = 2;  // Standard - balanced
    case DR7 = 3;  // Boost - short range, fast, hungry

    public function slug(): string
    {
        return match ($this) {
            self::DR3 => 'dr_3',
            self::DR5 => 'dr_5',
            self::DR7 => 'dr_7',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::DR3 => __('DR-3 Economy', 'helm'),
            self::DR5 => __('DR-5 Standard', 'helm'),
            self::DR7 => __('DR-7 Boost', 'helm'),
        };
    }

    /**
     * Base maximum jump distance in light-years (sustain).
     *
     * Actual range = sustain × coreOutput × performanceRatio
     */
    public function sustain(): float
    {
        return match ($this) {
            self::DR3 => 10.0,  // Long hauls
            self::DR5 => 7.0,   // Balanced
            self::DR7 => 5.0,   // Short sprints
        };
    }

    /**
     * Speed multiplier - amplitude (higher = faster jumps).
     *
     * Actual speed = amplitude × coreOutput × performanceRatio
     */
    public function amplitude(): float
    {
        return match ($this) {
            self::DR3 => 0.5,   // Slow and steady
            self::DR5 => 1.0,   // Baseline
            self::DR7 => 2.0,   // Fast
        };
    }

    /**
     * Power consumption factor.
     *
     * Determines how much core output the drive demands.
     * performanceRatio = min(1.0, coreOutput / consumption)
     *
     * When core output < consumption, drive underperforms.
     */
    public function consumption(): float
    {
        return match ($this) {
            self::DR3 => 0.6,   // Efficient, runs well on low power
            self::DR5 => 1.0,   // Baseline
            self::DR7 => 1.5,   // Hungry, needs overdrive to shine
        };
    }

    /**
     * Core decay multiplier (higher = burns core faster per jump).
     *
     * @deprecated Use consumption() for power calculations. This remains for
     *             backwards compatibility during migration.
     */
    public function decayMultiplier(): float
    {
        return $this->consumption();
    }

    /**
     * Speed multiplier.
     *
     * @deprecated Use amplitude() instead.
     */
    public function speedMultiplier(): float
    {
        return $this->amplitude();
    }
}
