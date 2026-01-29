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
        $this->container->singleton(StarCatalog::class, function () {
            $catalogPath = HELM_PATH . 'data/stars_100ly.json';
            return new StarCatalog($catalogPath);
        });

        $this->container->singleton(StarRepository::class, function () {
            return new StarRepository();
        });

        $this->container->singleton(StarBatchGenerator::class, function () {
            return new StarBatchGenerator(
                $this->container->get(StarCatalog::class),
                $this->container->get(StarRepository::class),
            );
        });
    }

    public function boot(): void
    {
        add_action(
            StarBatchGenerator::HOOK_GENERATE_BATCH,
            [$this, 'handleStarBatch'],
            10,
            2
        );
    }

    /**
     * Handle star batch generation via Action Scheduler.
     */
    public function handleStarBatch(int $offset, int $batchSize): void
    {
        /** @var StarBatchGenerator $generator */
        $generator = $this->container->get(StarBatchGenerator::class);
        $generator->handleBatch($offset, $batchSize);
    }
}
