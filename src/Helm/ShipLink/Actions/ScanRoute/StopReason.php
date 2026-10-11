<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

/** Stable public outcome codes, not action failures. */
enum StopReason: string
{
    case LowChance = 'low_discovery_chance';
    case Budget = 'resource_budget_reached';
    case Resources = 'resource_exhausted';
    case CycleLimit = 'cycle_limit_reached';
    case Revisited = 'revisited_node';

    public function message(): string
    {
        return match ($this) {
            self::LowChance => __('Scanning stopped because the next connection has too little chance of discovery.', 'helm'),
            self::Budget => __('Scanning stopped before exceeding its core budget.', 'helm'),
            self::Resources => __('Scanning stopped because there is insufficient core life for another cycle.', 'helm'),
            self::CycleLimit => __('Scanning stopped at its cycle limit.', 'helm'),
            self::Revisited => __('Scanning stopped because the route returned to a previously discovered node.', 'helm'),
        };
    }
}
