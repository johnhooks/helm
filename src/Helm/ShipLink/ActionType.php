<?php

declare(strict_types=1);

namespace Helm\ShipLink;

/**
 * Action types that can be processed by ShipLink.
 */
enum ActionType: string
{
    // Navigation
    case ScanRoute = 'scan_route';
    case Jump = 'jump';

    // Exploration
    case Survey = 'survey';
    case ScanPlanet = 'scan_planet';

    // Resources
    case Mine = 'mine';
    case Refine = 'refine';

    // Trade
    case Buy = 'buy';
    case Sell = 'sell';
    case Transfer = 'transfer';

    // Ship
    case Repair = 'repair';
    case Upgrade = 'upgrade';

    /**
     * Check if this action requires time to complete (must be queued).
     */
    public function requiresTime(): bool
    {
        return match ($this) {
            self::ScanRoute,
            self::Jump,
            self::Survey,
            self::ScanPlanet,
            self::Mine,
            self::Refine,
            self::Repair => true,

            self::Buy,
            self::Sell,
            self::Transfer,
            self::Upgrade => false,
        };
    }

    /**
     * Get human-readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::ScanRoute => __('Route Scan', 'helm'),
            self::Jump => __('Jump', 'helm'),
            self::Survey => __('System Survey', 'helm'),
            self::ScanPlanet => __('Planet Scan', 'helm'),
            self::Mine => __('Mining', 'helm'),
            self::Refine => __('Refining', 'helm'),
            self::Buy => __('Purchase', 'helm'),
            self::Sell => __('Sale', 'helm'),
            self::Transfer => __('Transfer', 'helm'),
            self::Repair => __('Repair', 'helm'),
            self::Upgrade => __('Upgrade', 'helm'),
        };
    }
}
