<?php

declare(strict_types=1);

namespace Helm\Products;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for the Products domain.
 *
 * Products are universal catalog items that can be used by ships,
 * stations, gates, and other entities.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(ProductRepository::class);
        $this->container->singleton(ProductSeeder::class);
    }

    public function boot(): void
    {
        // Products provider has no boot actions currently
    }
}
