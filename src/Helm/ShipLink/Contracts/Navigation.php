<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use Helm\Navigation\EdgeInfo;
use Helm\Navigation\Node;
use Helm\Navigation\ScanResult;

/**
 * Navigation system contract.
 *
 * Handles route computation and nav computer capabilities.
 * Delegates graph operations to NavigationService.
 *
 * This is a read-only interface - Ship is responsible for all mutations.
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

    /**
     * Get route information to a target node.
     *
     * Returns edge info including distance, or error if no route.
     *
     * @param int $targetNodeId Target node
     * @return EdgeInfo|\WP_Error Edge info or error
     */
    public function getRouteInfo(int $targetNodeId): EdgeInfo|\WP_Error;

    /**
     * Scan for routes toward a destination.
     *
     * Uses nav computer skill and efficiency to discover waypoints.
     *
     * @param int $targetNodeId Target node
     * @return ScanResult Discovered nodes and edges
     */
    public function scanForRoutes(int $targetNodeId): ScanResult;

    /**
     * Get all nodes connected to current position.
     *
     * @return array<array{node: Node, distance: float}> Connected nodes
     */
    public function getConnectedNodes(): array;
}
