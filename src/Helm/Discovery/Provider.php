<?php

declare(strict_types=1);

namespace Helm\Discovery;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Discovery components.
 *
 * Table creation is handled by Database\Provider.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(DiscoveryRepository::class);
        $this->container->singleton(DiscoveryService::class);
    }

    public function boot(): void
    {
        // Table creation is now handled by Database\Provider
    }
}
