<?php

declare(strict_types=1);

namespace Helm\Stars;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Stars components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->when(StarCatalog::class)
            ->needs('$catalogPath')
            ->give(HELM_PATH . 'data/stars_100ly.json');

        $this->container->singleton(StarCatalog::class);
        $this->container->singleton(StarRepository::class);
        $this->container->singleton(StarBatchGenerator::class);
    }

    public function boot(): void
    {
        add_action(
            StarBatchGenerator::HOOK_GENERATE_BATCH,
            $this->container->callback(StarBatchGenerator::class, 'handleBatch'),
            10,
            2
        );
    }
}
