<?php

declare(strict_types=1);

namespace Helm\Generation;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Generation components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(SystemGenerator::class, function () {
            return new SystemGenerator();
        });
    }

    public function boot(): void
    {
        // Generation is stateless, no hooks needed
    }
}
