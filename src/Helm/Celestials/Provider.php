<?php

declare(strict_types=1);

namespace Helm\Celestials;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Celestials components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(CelestialRepository::class);

        $this->container->singleton(CelestialService::class, fn () => new CelestialService(
            $this->container->get(CelestialRepository::class),
        ));
    }

    public function boot(): void
    {
        // No hooks needed at this time
    }
}
