<?php

declare(strict_types=1);

namespace Helm\Anomalies;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Anomalies components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(AnomalyRepository::class);
    }

    public function boot(): void
    {
        // No hooks needed at this time
    }
}
