<?php

declare(strict_types=1);

namespace Helm\Planets;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Planets components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(PlanetRepository::class);
        $this->container->singleton(PlanetBatchGenerator::class);
    }

    public function boot(): void
    {
        add_action(
            PlanetBatchGenerator::HOOK_GENERATE_BATCH,
            $this->container->callback(PlanetBatchGenerator::class, 'handleBatch'),
            10,
            2
        );
    }
}
