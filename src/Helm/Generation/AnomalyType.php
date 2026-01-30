<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Space anomaly types.
 */
enum AnomalyType: string
{
    case Derelict = 'derelict';
    case Signal = 'signal';
    case Artifact = 'artifact';
    case Phenomenon = 'phenomenon';
    case Wreckage = 'wreckage';

    public function label(): string
    {
        return match ($this) {
            self::Derelict => __('Derelict', 'helm'),
            self::Signal => __('Signal', 'helm'),
            self::Artifact => __('Artifact', 'helm'),
            self::Phenomenon => __('Phenomenon', 'helm'),
            self::Wreckage => __('Wreckage', 'helm'),
        };
    }
}
