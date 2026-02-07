<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Planet classification types.
 */
enum PlanetType: string
{
    // Rocky planets
    case Terrestrial = 'terrestrial';
    case SuperEarth = 'super-earth';
    case Dwarf = 'dwarf';
    case Molten = 'molten';
    case Frozen = 'frozen';

    // Gas planets
    case GasGiant = 'gas-giant';
    case IceGiant = 'ice-giant';
    case HotJupiter = 'hot-jupiter';
    case MiniNeptune = 'mini-neptune';

    // Special types
    case Rogue = 'rogue';           // Starless drifter, found at waypoints
    case Anomalous = 'anomalous';   // Readings don't make sense
    case Void = 'void';             // Sensors malfunction, something's wrong

    public function label(): string
    {
        return match ($this) {
            self::Terrestrial => __('Terrestrial', 'helm'),
            self::SuperEarth => __('Super Earth', 'helm'),
            self::GasGiant => __('Gas Giant', 'helm'),
            self::IceGiant => __('Ice Giant', 'helm'),
            self::Dwarf => __('Dwarf Planet', 'helm'),
            self::Molten => __('Molten', 'helm'),
            self::Frozen => __('Frozen', 'helm'),
            self::HotJupiter => __('Hot Jupiter', 'helm'),
            self::MiniNeptune => __('Mini Neptune', 'helm'),
            self::Rogue => __('Rogue Planet', 'helm'),
            self::Anomalous => __('Anomalous', 'helm'),
            self::Void => __('Void', 'helm'),
        };
    }

    /**
     * Check if this planet type can potentially be habitable.
     */
    public function canBeHabitable(): bool
    {
        return match ($this) {
            self::Terrestrial, self::SuperEarth => true,
            default => false,
        };
    }

    /**
     * Check if this is a mystery/special planet type.
     */
    public function isSpecial(): bool
    {
        return match ($this) {
            self::Rogue, self::Anomalous, self::Void => true,
            default => false,
        };
    }

    /**
     * Check if sensors work normally on this planet type.
     */
    public function sensorsReliable(): bool
    {
        return match ($this) {
            self::Anomalous, self::Void => false,
            default => true,
        };
    }

    /**
     * Check if this planet type always has rings.
     */
    public function alwaysRinged(): bool
    {
        return match ($this) {
            self::Void => true,
            default => false,
        };
    }

    /**
     * Check if this planet type can have surface conditions.
     *
     * Only rocky planets with solid surfaces can have ocean/desert/toxic variants.
     */
    public function canHaveSurfaceCondition(): bool
    {
        return match ($this) {
            self::Terrestrial, self::SuperEarth => true,
            default => false,
        };
    }
}
