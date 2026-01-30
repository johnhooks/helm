<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Space station types.
 */
enum StationType: string
{
    case Trading = 'trading';
    case Mining = 'mining';
    case Research = 'research';
    case Military = 'military';
    case Refueling = 'refueling';

    public function label(): string
    {
        return match ($this) {
            self::Trading => __('Trading Station', 'helm'),
            self::Mining => __('Mining Station', 'helm'),
            self::Research => __('Research Station', 'helm'),
            self::Military => __('Military Station', 'helm'),
            self::Refueling => __('Refueling Station', 'helm'),
        };
    }
}
