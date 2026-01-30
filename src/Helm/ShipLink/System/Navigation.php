<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\ShipLink\Contracts\Navigation as NavigationContract;
use Helm\ShipLink\ShipModel;

/**
 * Navigation system implementation.
 */
final class Navigation implements NavigationContract
{
    /**
     * Decay factor per hop for route discovery.
     */
    private const HOP_DECAY_FACTOR = 0.9;

    public function __construct(
        private ShipModel $model,
    ) {
    }

    public function getTier(): int
    {
        return $this->model->navTier->value;
    }

    public function getSkill(): float
    {
        return $this->model->navTier->skill();
    }

    public function getEfficiency(): float
    {
        return $this->model->navTier->efficiency();
    }

    public function getDiscoveryProbability(int $hopDepth): float
    {
        $base = $this->getSkill() * $this->getEfficiency();
        $decay = pow(self::HOP_DECAY_FACTOR, $hopDepth);

        return min(1.0, $base * $decay);
    }

    public function getCurrentPosition(): ?int
    {
        return $this->model->nodeId;
    }

    public function hasRouteTo(int $nodeId): bool
    {
        // This would need to check the nav_routes table
        // For now, return false - will be implemented with route discovery
        return false;
    }
}
