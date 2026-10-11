<?php

declare(strict_types=1);

namespace Helm\ShipLink\Actions\ScanRoute;

/** Stable public reasons for ending a scan. */
enum StopReason: string
{
    case LowChance = 'low_discovery_chance';
    case PlayerStopped = 'player_stopped';
    case Resources = 'resource_exhausted';
    case CycleLimit = 'cycle_limit_reached';
    case Revisited = 'revisited_node';

    public function message(): string
    {
        return match ($this) {
            self::PlayerStopped => __('Scan stopped by the player.', 'helm'),
            self::LowChance => __('Scanning stopped because the next connection has too little chance of discovery.', 'helm'),
            self::Resources => __('Scanning stopped because there is insufficient power for another cycle.', 'helm'),
            self::CycleLimit => __('Scanning stopped at its cycle limit.', 'helm'),
            self::Revisited => __('Scanning stopped because the route returned to a previously discovered node.', 'helm'),
        };
    }
}
