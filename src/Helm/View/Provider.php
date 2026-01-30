<?php

declare(strict_types=1);

namespace Helm\View;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for View rendering.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(View::class, function () {
            return new ViewRenderer(
                dirname(__DIR__, 2) . '/views'
            );
        });
    }

    public function boot(): void
    {
        // No boot actions needed
    }
}
