<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Planet classification types.
 */
enum PlanetType: string
{
    case Terrestrial = 'terrestrial';
    case SuperEarth = 'super-earth';
    case GasGiant = 'gas-giant';
    case IceGiant = 'ice-giant';
    case Dwarf = 'dwarf';
    case Molten = 'molten';
    case Frozen = 'frozen';
    case HotJupiter = 'hot-jupiter';
    case MiniNeptune = 'mini-neptune';

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
}
