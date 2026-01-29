<?php

declare(strict_types=1);

namespace Helm\Planets;

use Helm\Generation\SystemGenerator;
use Helm\lucatume\DI52\ServiceProvider;
use Helm\Origin\Origin;
use Helm\Stars\StarRepository;

/**
 * Service provider for Planets components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(PlanetRepository::class, function () {
            return new PlanetRepository(
                $this->container->get(StarRepository::class),
            );
        });

        $this->container->singleton(PlanetBatchGenerator::class, function () {
            return new PlanetBatchGenerator(
                $this->container->get(StarRepository::class),
                $this->container->get(PlanetRepository::class),
                $this->container->get(SystemGenerator::class),
                $this->container->get(Origin::class),
            );
        });
    }

    public function boot(): void
    {
        add_action(
            PlanetBatchGenerator::HOOK_GENERATE_BATCH,
            [$this, 'handlePlanetBatch'],
            10,
            2
        );
    }

    /**
     * Handle planet batch generation via Action Scheduler.
     */
    public function handlePlanetBatch(int $offset, int $batchSize): void
    {
        /** @var PlanetBatchGenerator $generator */
        $generator = $this->container->get(PlanetBatchGenerator::class);
        $generator->handleBatch($offset, $batchSize);
    }
}
