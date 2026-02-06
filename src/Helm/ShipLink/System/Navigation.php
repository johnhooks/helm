<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\Navigation\EdgeInfo;
use Helm\Navigation\NavigationService;
use Helm\Navigation\Node;
use Helm\Navigation\ScanResult;
use Helm\ShipLink\Contracts\Navigation as NavigationContract;
use Helm\ShipLink\Loadout;
use Helm\ShipLink\Models\ShipState;

/**
 * Navigation system implementation.
 *
 * The ship's nav computer - delegates graph operations to NavigationService.
 *
 * This system is read-only - it reports state and calculates values.
 * Ship is responsible for all mutations to ShipState.
 */
final class Navigation implements NavigationContract
{
    /**
     * Decay factor per hop for route discovery.
     */
    private const HOP_DECAY_FACTOR = 0.9;

    public function __construct(
        private ShipState $state,
        private Loadout $loadout,
        private readonly NavigationService $navService,
    ) {
    }

    public function getTier(): int
    {
        // Extract tier from slug (e.g. nav_tier_1 → 1)
        $slug = $this->loadout->nav()->slug();
        $parts = explode('_', $slug);
        return (int) end($parts);
    }

    public function getSkill(): float
    {
        return $this->loadout->nav()->type()->mult_a ?? 0.0;
    }

    public function getEfficiency(): float
    {
        return $this->loadout->nav()->type()->mult_b ?? 0.0;
    }

    public function getDiscoveryProbability(int $hopDepth): float
    {
        $base = $this->getSkill() * $this->getEfficiency();
        $decay = pow(self::HOP_DECAY_FACTOR, $hopDepth);

        return min(1.0, $base * $decay);
    }

    public function getCurrentPosition(): ?int
    {
        return $this->state->node_id;
    }

    public function hasRouteTo(int $nodeId): bool
    {
        // Check if there's a known edge to the target
        $currentPosition = $this->getCurrentPosition();
        if ($currentPosition === null) {
            return false;
        }

        $edgeInfo = $this->navService->getEdgeInfo($currentPosition, $nodeId);
        return !is_wp_error($edgeInfo);
    }

    public function getRouteInfo(int $targetNodeId): EdgeInfo|\WP_Error
    {
        $currentPosition = $this->getCurrentPosition();

        if ($currentPosition === null) {
            return new \WP_Error(
                'no_position',
                __('Ship is not at a valid position', 'helm')
            );
        }

        return $this->navService->getEdgeInfo($currentPosition, $targetNodeId);
    }

    public function scanForRoutes(int $targetNodeId): ScanResult
    {
        $currentPosition = $this->getCurrentPosition();

        if ($currentPosition === null) {
            return ScanResult::failure();
        }

        return $this->navService->scan(
            fromNodeId: $currentPosition,
            toNodeId: $targetNodeId,
            skill: $this->getSkill(),
            efficiency: $this->getEfficiency(),
        );
    }

    /**
     * @return array<array{node: Node, distance: float}>
     */
    public function getConnectedNodes(): array
    {
        $currentPosition = $this->getCurrentPosition();

        if ($currentPosition === null) {
            return [];
        }

        return $this->navService->getConnectedNodes($currentPosition);
    }
}
