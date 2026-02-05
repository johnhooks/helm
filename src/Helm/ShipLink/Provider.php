<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Lib\MethodInvoker;
use Helm\lucatume\DI52\ServiceProvider;
use Helm\Navigation\NavigationService;

/**
 * Service provider for ShipLink components.
 *
 * Registers the ShipLink architecture: factory, resolver, repositories.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(ShipStateRepository::class, function () {
            return new ShipStateRepository();
        });

        $this->container->singleton(ShipSystemsRepository::class, function () {
            return new ShipSystemsRepository();
        });

        $this->container->singleton(ActionRepository::class, function () {
            return new ActionRepository();
        });

        $this->container->singleton(ShipFactory::class, function () {
            return new ShipFactory(
                $this->container->get(ShipStateRepository::class),
                $this->container->get(ShipSystemsRepository::class),
                $this->container->get(NavigationService::class),
            );
        });

        $this->container->singleton(MethodInvoker::class, function () {
            return new MethodInvoker($this->container);
        });

        $this->container->singleton(ActionFactory::class, function () {
            return new ActionFactory(
                $this->container,
                $this->container->get(ActionRepository::class),
                $this->container->get(ShipStateRepository::class),
                $this->container->get(ShipSystemsRepository::class),
                $this->container->get(ShipFactory::class),
            );
        });

        $this->container->singleton(ActionResolver::class, function () {
            return new ActionResolver(
                $this->container,
                $this->container->get(ActionRepository::class),
                $this->container->get(ShipStateRepository::class),
                $this->container->get(ShipSystemsRepository::class),
                $this->container->get(ShipFactory::class),
            );
        });

        $this->container->singleton(ActionProcessor::class, function () {
            return new ActionProcessor(
                $this->container->get(ActionRepository::class),
                $this->container->get(ActionResolver::class),
            );
        });
    }

    public function boot(): void
    {
        $this->registerProcessorHook();
        $this->ensureProcessorScheduled();
    }

    /**
     * Register the cron hook for batch action processing.
     */
    private function registerProcessorHook(): void
    {
        add_action(
            ActionProcessor::HOOK,
            function (): void {
                /** @var ActionProcessor $processor */
                $processor = $this->container->get(ActionProcessor::class);
                $processor->processReady();
            }
        );
    }

    /**
     * Ensure the recurring cron job is scheduled.
     */
    private function ensureProcessorScheduled(): void
    {
        // Only schedule on admin requests to avoid overhead on every page load
        if (! is_admin() && ! (defined('WP_CLI') && WP_CLI)) {
            return;
        }

        /** @var ActionProcessor $processor */
        $processor = $this->container->get(ActionProcessor::class);
        $processor->ensureScheduled();
    }
}
