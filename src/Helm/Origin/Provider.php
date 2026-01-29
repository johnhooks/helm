<?php

declare(strict_types=1);

namespace Helm\Origin;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Origin components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(Origin::class, function () {
            return new Origin();
        });
    }

    public function boot(): void
    {
        // Origin uses wp_options, no setup needed
    }
}
