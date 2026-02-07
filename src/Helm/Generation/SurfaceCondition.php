<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Surface conditions for rocky planets.
 *
 * Modifies resource availability and habitability.
 * Only applies to: Terrestrial, SuperEarth.
 */
enum SurfaceCondition: string
{
    case Temperate = 'temperate';  // Default, balanced conditions
    case Ocean = 'ocean';          // Water world, mostly liquid surface
    case Desert = 'desert';        // Arid, minimal water
    case Toxic = 'toxic';          // Hostile atmosphere, hazardous

    public function label(): string
    {
        return match ($this) {
            self::Temperate => __('Temperate', 'helm'),
            self::Ocean => __('Ocean World', 'helm'),
            self::Desert => __('Desert', 'helm'),
            self::Toxic => __('Toxic', 'helm'),
        };
    }

    /**
     * Check if this surface condition allows habitability.
     */
    public function canBeHabitable(): bool
    {
        return match ($this) {
            self::Temperate, self::Ocean => true,
            self::Desert, self::Toxic => false,
        };
    }

    /**
     * Check if this surface is hazardous to operations.
     */
    public function isHazardous(): bool
    {
        return match ($this) {
            self::Toxic => true,
            default => false,
        };
    }

    /**
     * Get resource modifiers for this surface condition.
     *
     * Returns multipliers or additions to base planet resources.
     *
     * @return array<string, float> Resource slug => multiplier (1.0 = no change)
     */
    public function resourceModifiers(): array
    {
        return match ($this) {
            self::Temperate => [],
            self::Ocean => [
                'water_ice' => 2.0,
                'proteins' => 1.5,
                'biomass' => 1.5,
            ],
            self::Desert => [
                'water_ice' => 0.1,
                'rare_earth_ore' => 1.5,
                'crystals' => 2.0,
            ],
            self::Toxic => [
                'biomass' => 0.0,
                'proteins' => 0.0,
                'rare_compounds' => 2.0,
                'exotic_gas' => 1.5,
            ],
        };
    }

    /**
     * Get bonus resources that may appear on this surface type.
     *
     * @return array<string> Resource slugs that have a chance to appear
     */
    public function bonusResources(): array
    {
        return match ($this) {
            self::Temperate => [],
            self::Ocean => ['proteins', 'biomass'],
            self::Desert => ['crystals', 'rare_earth_ore'],
            self::Toxic => ['rare_compounds', 'exotic_gas'],
        };
    }
}
