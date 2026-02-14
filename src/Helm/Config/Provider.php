<?php

declare(strict_types=1);

namespace Helm\Config;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Config.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(Config::class);
    }

    public function boot(): void
    {
        // Config uses wp_options, no setup needed
    }
}
