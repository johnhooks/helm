<?php

declare(strict_types=1);

namespace Helm\Stations;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Stations components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(StationRepository::class);
    }

    public function boot(): void
    {
        // No hooks needed at this time
    }
}
