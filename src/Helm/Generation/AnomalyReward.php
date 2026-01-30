<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Reward types from anomalies.
 */
enum AnomalyReward: string
{
    case Credits = 'credits';
    case Resources = 'resources';
    case Technology = 'technology';
    case Data = 'data';
    case Artifact = 'artifact';

    public function label(): string
    {
        return match ($this) {
            self::Credits => __('Credits', 'helm'),
            self::Resources => __('Resources', 'helm'),
            self::Technology => __('Technology', 'helm'),
            self::Data => __('Data', 'helm'),
            self::Artifact => __('Artifact', 'helm'),
        };
    }
}
