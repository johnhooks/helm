<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

/**
 * Navigation system contract.
 *
 * Handles route computation and nav computer capabilities.
 */
interface Navigation
{
    /**
     * Get nav computer tier (1-5).
     */
    public function getTier(): int;

    /**
     * Get skill value for multi-hop route discovery.
     *
     * Higher tiers have better skill values.
     */
    public function getSkill(): float;

    /**
     * Get efficiency factor for route computation.
     */
    public function getEfficiency(): float;

    /**
     * Calculate discovery probability for a given hop depth.
     *
     * Formula: skill * efficiency * (0.9 ^ hop_count)
     */
    public function getDiscoveryProbability(int $hopDepth): float;

    /**
     * Get current ship position (node ID).
     */
    public function getCurrentPosition(): ?int;

    /**
     * Check if ship has a known route to destination.
     */
    public function hasRouteTo(int $nodeId): bool;
}
