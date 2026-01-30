<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Shield types.
 *
 * Shields determine:
 * - Maximum shield capacity
 * - Shield regeneration rate
 */
enum ShieldType: int
{
    case Light = 1;
    case Standard = 2;
    case Heavy = 3;

    public function slug(): string
    {
        return match ($this) {
            self::Light => 'light',
            self::Standard => 'standard',
            self::Heavy => 'heavy',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Light => __('Light Shields', 'helm'),
            self::Standard => __('Standard Shields', 'helm'),
            self::Heavy => __('Heavy Shields', 'helm'),
        };
    }

    /**
     * Maximum shield capacity.
     */
    public function maxCapacity(): float
    {
        return match ($this) {
            self::Light => 50.0,
            self::Standard => 100.0,
            self::Heavy => 200.0,
        };
    }

    /**
     * Shield regeneration rate (units per hour).
     */
    public function regenRate(): float
    {
        return match ($this) {
            self::Light => 20.0,
            self::Standard => 10.0,
            self::Heavy => 5.0,
        };
    }
}
