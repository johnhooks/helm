<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Services available at space stations.
 */
enum StationService: string
{
    case Trade = 'trade';
    case Repair = 'repair';
    case Refuel = 'refuel';
    case Upgrade = 'upgrade';
    case Missions = 'missions';

    public function label(): string
    {
        return match ($this) {
            self::Trade => __('Trade', 'helm'),
            self::Repair => __('Repair', 'helm'),
            self::Refuel => __('Refuel', 'helm'),
            self::Upgrade => __('Upgrade', 'helm'),
            self::Missions => __('Missions', 'helm'),
        };
    }
}
