<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Inventory\Contracts\InventoryRepository;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Products\Contracts\ProductRepository;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\LoadoutFactory;
use Helm\ShipLink\Contracts\ShipStateRepository;
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
        $this->container->singleton(ShipStateRepository::class, InMemoryShipStateRepository::class);
        $this->container->singleton(ActionRepository::class, InMemoryActionRepository::class);
        $this->container->singleton(InventoryRepository::class, InMemoryInventoryRepository::class);
        $this->container->singleton(ProductRepository::class, InMemoryProductRepository::class);
        $this->container->singleton(NodeRepository::class, InMemoryNodeRepository::class);
        $this->container->singleton(EdgeRepository::class, InMemoryEdgeRepository::class);

        // LoadoutFactory
        $this->container->singleton(LoadoutFactory::class, InMemoryLoadoutFactory::class);

        // Simulation orchestrator
        $this->container->singleton(Simulation::class);
    }

    public function boot(): void
    {
        // Seed products into in-memory store
        $seeder = $this->container->get(\Helm\Products\ProductSeeder::class);
        $seeder->seed();
    }
}
