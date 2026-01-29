<?php

declare(strict_types=1);

namespace Helm\Ships;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Ships components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(ShipRepository::class, function () {
            return new ShipRepository();
        });

        $this->container->singleton(ShipService::class, function () {
            return new ShipService(
                $this->container->get(ShipRepository::class)
            );
        });
    }

    public function boot(): void
    {
        // Ships now use CPT, no custom table needed
    }
}
