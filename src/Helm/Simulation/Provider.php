<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Products\Contracts\ProductRepository;
use Helm\Navigation\NavComputer;
use Helm\Navigation\NavigationService;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\ActionResolver;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\LoadoutFactory;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\ShipFactory;
use Helm\lucatume\DI52\ServiceProvider;

/**
 * Re-binds the container for simulation mode.
 *
 * Replaces all Wpdb* repositories and LoadoutFactory with in-memory
 * implementations, enabling the game loop to run without database I/O.
 *
 * Register this provider AFTER the normal providers to override bindings.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        // Repositories
        $this->container->singleton(ShipStateRepository::class, MemoryShipStateRepository::class);
        $this->container->singleton(ActionRepository::class, MemoryActionRepository::class);
        $this->container->singleton(InventoryRepository::class, MemoryInventoryRepository::class);
        $this->container->singleton(ProductRepository::class, MemoryProductRepository::class);
        $this->container->singleton(NodeRepository::class, MemoryNodeRepository::class);
        $this->container->singleton(EdgeRepository::class, MemoryEdgeRepository::class);

        // LoadoutFactory
        $this->container->singleton(LoadoutFactory::class, MemoryLoadoutFactory::class);

        // Re-register dependent singletons so they pick up the
        // in-memory bindings instead of cached Wpdb* instances.
        $this->container->singleton(NavComputer::class);
        $this->container->singleton(NavigationService::class);
        $this->container->singleton(ShipFactory::class);
        $this->container->singleton(ActionFactory::class);
        $this->container->singleton(ActionResolver::class);
        $this->container->singleton(ActionProcessor::class);

        // Simulation orchestrator
        $this->container->singleton(Simulation::class);
    }

    public function boot(): void
    {
        // Seed products into in-memory store.
        // Create the seeder directly to ensure it uses the rebound
        // MemoryProductRepository, not a cached singleton with Wpdb*.
        $seeder = new \Helm\Products\ProductSeeder(
            $this->container->get(ProductRepository::class)
        );
        $seeder->seed();
    }
}
