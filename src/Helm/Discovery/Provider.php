<?php

declare(strict_types=1);

namespace Helm\Discovery;

use Helm\lucatume\DI52\ServiceProvider;
use Helm\Origin\Origin;

/**
 * Service provider for Discovery components.
 *
 * Table creation is handled by Database\Provider.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(DiscoveryRepository::class, function () {
            global $wpdb;
            return new DiscoveryRepository($wpdb);
        });

        $this->container->singleton(DiscoveryService::class, function () {
            return new DiscoveryService(
                $this->container->get(DiscoveryRepository::class),
                $this->container->get(Origin::class),
            );
        });
    }

    public function boot(): void
    {
        // Table creation is now handled by Database\Provider
    }
}
