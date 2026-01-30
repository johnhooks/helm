<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Shield types.
 *
 * Aegis series shields with Greek letter designations:
 * - Alpha: Light, fast-regenerating shields
 * - Beta: Balanced capacity and regen
 * - Gamma: Heavy, high-capacity shields
 */
enum ShieldType: int
{
    case Alpha = 1;  // Light - fast regen, low capacity
    case Beta = 2;   // Standard - balanced
    case Gamma = 3;  // Heavy - slow regen, high capacity

    public function slug(): string
    {
        return match ($this) {
            self::Alpha => 'aegis_alpha',
            self::Beta => 'aegis_beta',
            self::Gamma => 'aegis_gamma',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Alpha => __('Aegis Alpha', 'helm'),
            self::Beta => __('Aegis Beta', 'helm'),
            self::Gamma => __('Aegis Gamma', 'helm'),
        };
    }

    /**
     * Maximum shield capacity.
     */
    public function maxCapacity(): float
    {
        return match ($this) {
            self::Alpha => 50.0,
            self::Beta => 100.0,
            self::Gamma => 200.0,
        };
    }

    /**
     * Shield regeneration rate (units per hour).
     */
    public function regenRate(): float
    {
        return match ($this) {
            self::Alpha => 20.0,
            self::Beta => 10.0,
            self::Gamma => 5.0,
        };
    }
}
