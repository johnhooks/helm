<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\lucatume\DI52\ServiceProvider;
use Helm\Navigation\NavigationService;

/**
 * Service provider for ShipLink components.
 *
 * Registers the ShipLink architecture: factory, repositories, and related services.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(ShipSystemsRepository::class, function () {
            return new ShipSystemsRepository();
        });

        $this->container->singleton(ShipFactory::class, function () {
            return new ShipFactory(
                $this->container->get(ShipSystemsRepository::class),
                $this->container->get(NavigationService::class),
            );
        });
    }

    public function boot(): void
    {
        // ShipLink systems are initialized when ships are built via ShipFactory
    }
}
