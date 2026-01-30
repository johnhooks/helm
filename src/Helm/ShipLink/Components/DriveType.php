<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Drive types.
 *
 * Drives determine:
 * - Jump speed (how long travel takes)
 * - Core decay multiplier (efficiency vs speed tradeoff)
 */
enum DriveType: int
{
    case DR3 = 1;  // Economy
    case DR5 = 2;  // Standard
    case DR7 = 3;  // Boost

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
     * Speed multiplier (higher = faster jumps).
     */
    public function speedMultiplier(): float
    {
        return match ($this) {
            self::DR3 => 0.5,
            self::DR5 => 1.0,
            self::DR7 => 2.0,
        };
    }

    /**
     * Core decay multiplier (higher = burns core faster).
     */
    public function decayMultiplier(): float
    {
        return match ($this) {
            self::DR3 => 0.75,
            self::DR5 => 1.0,
            self::DR7 => 1.5,
        };
    }
}
