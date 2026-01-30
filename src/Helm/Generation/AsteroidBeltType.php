<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Asteroid belt composition types.
 */
enum AsteroidBeltType: string
{
    case Rocky = 'rocky';
    case Metallic = 'metallic';
    case Icy = 'icy';
    case Mixed = 'mixed';

    public function label(): string
    {
        return match ($this) {
            self::Rocky => __('Rocky', 'helm'),
            self::Metallic => __('Metallic', 'helm'),
            self::Icy => __('Icy', 'helm'),
            self::Mixed => __('Mixed', 'helm'),
        };
    }
}
