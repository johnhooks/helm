<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Celestials\CelestialRepository;
use Helm\Celestials\CelestialType;
use Helm\lucatume\DI52\ServiceProvider;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Stars\Star;
use Helm\Stars\StarPost;
use Helm\Stars\StarRepository;

/**
 * Navigation service provider.
 *
 * Registers navigation repositories and services.
 * Table creation is handled by Database\Provider.
 */
final class Provider extends ServiceProvider
{
    /**
     * Maximum distance (in light years) for binary star companions
     * to share a single navigation node.
     */
    public const BINARY_GROUPING_THRESHOLD_LY = 0.2;

    public function register(): void
    {
        $this->container->singleton(NodeRepository::class, WpdbNodeRepository::class);
        $this->container->singleton(EdgeRepository::class, WpdbEdgeRepository::class);
        $this->container->singleton(RouteRepository::class);
        $this->container->singleton(NodeGenerator::class);
        $this->container->singleton(NavComputer::class);
        $this->container->singleton(NavigationService::class);
    }

    public function boot(): void
    {
        // Create nav_node when a star is created
        add_action('helm_star_created', [$this, 'onStarCreated'], 10, 2);
    }

    /**
     * Create a nav_node when a star is created.
     *
     * This integrates the star seeding process with navigation.
     * Stars get a corresponding node in the navigation graph.
     *
     * Binary/multi-star systems within BINARY_GROUPING_THRESHOLD_LY
     * share a single node, with multiple stars linked via celestials.
     */
    public function onStarCreated(StarPost $starPost, Star $star): void
    {
        $nodeRepository = $this->container->get(NodeRepository::class);
        $celestialRepository = $this->container->get(CelestialRepository::class);

        // Skip if celestial link already exists for this star
        $existingCelestial = $celestialRepository->findByContent(
            CelestialType::Star,
            $starPost->postId()
        );
        if ($existingCelestial !== null) {
            return;
        }

        // Calculate 3D coordinates from the star
        [$x, $y, $z] = $star->cartesian3D();

        // Check if this star should share a node with a binary companion
        $siblingNode = $this->findSiblingNode($star, $x, $y, $z);

        if ($siblingNode !== null) {
            // Reuse sibling's node for this binary companion
            $celestialRepository->link(
                $siblingNode->id,
                CelestialType::Star,
                $starPost->postId()
            );
            return;
        }

        // Create a new navigation node for this star
        $node = $nodeRepository->create(
            x: $x,
            y: $y,
            z: $z,
            type: NodeType::System,
        );

        // Create the celestial link
        $celestialRepository->link(
            $node->id,
            CelestialType::Star,
            $starPost->postId()
        );
    }

    /**
     * Find an existing node from a sibling star in the same system.
     *
     * Returns a node only if:
     * 1. The star has a system_id (is part of a multi-star system)
     * 2. A sibling star already has a node
     * 3. That node is within BINARY_GROUPING_THRESHOLD_LY
     */
    private function findSiblingNode(Star $star, float $x, float $y, float $z): ?Node
    {
        $systemId = $star->properties['system_id'] ?? null;
        if ($systemId === null) {
            return null;
        }

        $starRepository = $this->container->get(StarRepository::class);
        $nodeRepository = $this->container->get(NodeRepository::class);
        $celestialRepository = $this->container->get(CelestialRepository::class);

        // Find other stars in the same system
        $siblings = $starRepository->findBySystemId($systemId);

        foreach ($siblings as $siblingPost) {
            // Skip self
            if ($siblingPost->catalogId() === $star->id) {
                continue;
            }

            // Check if sibling has a node via celestials
            $celestial = $celestialRepository->findByContent(CelestialType::Star, $siblingPost->postId());
            if ($celestial === null) {
                continue;
            }

            $siblingNode = $nodeRepository->get($celestial->nodeId);
            if ($siblingNode === null) {
                continue;
            }

            // Calculate distance to sibling's node
            $distance = sqrt(
                ($x - $siblingNode->x) ** 2 +
                ($y - $siblingNode->y) ** 2 +
                ($z - $siblingNode->z) ** 2
            );

            // If within threshold, use this node
            if ($distance <= self::BINARY_GROUPING_THRESHOLD_LY) {
                return $siblingNode;
            }
        }

        return null;
    }
}
