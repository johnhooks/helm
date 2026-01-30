<?php

declare(strict_types=1);

namespace Helm\ShipLink\Components;

/**
 * Navigation computer tiers.
 *
 * Nav computers determine:
 * - Skill value for multi-hop route discovery
 * - Efficiency factor for route computation
 */
enum NavTier: int
{
    case Tier1 = 1;
    case Tier2 = 2;
    case Tier3 = 3;
    case Tier4 = 4;
    case Tier5 = 5;

    public function slug(): string
    {
        return 'nav_tier_' . $this->value;
    }

    public function label(): string
    {
        return match ($this) {
            self::Tier1 => __('Nav Computer Tier 1', 'helm'),
            self::Tier2 => __('Nav Computer Tier 2', 'helm'),
            self::Tier3 => __('Nav Computer Tier 3', 'helm'),
            self::Tier4 => __('Nav Computer Tier 4', 'helm'),
            self::Tier5 => __('Nav Computer Tier 5', 'helm'),
        };
    }

    /**
     * Skill value for multi-hop discovery (0.0 - 1.0).
     */
    public function skill(): float
    {
        return match ($this) {
            self::Tier1 => 0.3,
            self::Tier2 => 0.45,
            self::Tier3 => 0.6,
            self::Tier4 => 0.75,
            self::Tier5 => 0.9,
        };
    }

    /**
     * Efficiency factor for route computation.
     */
    public function efficiency(): float
    {
        return match ($this) {
            self::Tier1 => 0.5,
            self::Tier2 => 0.6,
            self::Tier3 => 0.7,
            self::Tier4 => 0.85,
            self::Tier5 => 1.0,
        };
    }
}
