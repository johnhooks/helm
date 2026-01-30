<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\lucatume\DI52\ServiceProvider;
use Helm\Origin\Origin;
use Helm\Stars\Star;
use Helm\Stars\StarPost;

/**
 * Navigation service provider.
 *
 * Registers navigation repositories and services.
 * Table creation is handled by Database\Provider.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(NodeRepository::class);
        $this->container->singleton(EdgeRepository::class);
        $this->container->singleton(RouteRepository::class);

        $this->container->singleton(NodeGenerator::class, fn () => new NodeGenerator(
            $this->container->get(Origin::class),
        ));

        $this->container->singleton(NavComputer::class, fn () => new NavComputer(
            $this->container->get(NodeGenerator::class),
            $this->container->get(NodeRepository::class),
            $this->container->get(EdgeRepository::class),
        ));

        $this->container->singleton(NavigationService::class, fn () => new NavigationService(
            $this->container->get(NavComputer::class),
            $this->container->get(NodeRepository::class),
            $this->container->get(EdgeRepository::class),
            $this->container->get(RouteRepository::class),
        ));
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
     * Each star gets a corresponding node in the navigation graph.
     */
    public function onStarCreated(StarPost $starPost, Star $star): void
    {
        $nodeRepository = $this->container->get(NodeRepository::class);

        // Skip if node already exists for this star
        if ($nodeRepository->getByStarPostId($starPost->postId()) !== null) {
            return;
        }

        // Calculate 3D coordinates from the star
        [$x, $y, $z] = $star->cartesian3D();

        // Create the navigation node
        $nodeRepository->create(
            x: $x,
            y: $y,
            z: $z,
            starPostId: $starPost->postId(),
        );
    }
}
