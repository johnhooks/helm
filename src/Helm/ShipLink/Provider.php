<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Inventory\InventoryRepository;
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

        $this->container->singleton(ActionRepository::class, function () {
            return new ActionRepository();
        });

        $this->container->singleton(LoadoutFactory::class, function () {
            return new LoadoutFactory(
                $this->container->get(\Helm\Products\ProductRepository::class),
                $this->container->get(InventoryRepository::class),
            );
        });

        $this->container->singleton(ShipFactory::class, function () {
            return new ShipFactory(
                $this->container->get(ShipStateRepository::class),
                $this->container->get(LoadoutFactory::class),
                $this->container->get(NavigationService::class),
                $this->container->get(InventoryRepository::class),
                $this->container->get(\Helm\Products\ProductRepository::class),
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
                $this->container->get(InventoryRepository::class),
                $this->container->get(ShipFactory::class),
            );
        });

        $this->container->singleton(ActionResolver::class, function () {
            return new ActionResolver(
                $this->container,
                $this->container->get(ActionRepository::class),
                $this->container->get(ShipStateRepository::class),
                $this->container->get(InventoryRepository::class),
                $this->container->get(ShipFactory::class),
            );
        });

        $this->container->singleton(ActionProcessor::class, function () {
            return new ActionProcessor(
                $this->container->get(ActionRepository::class),
                $this->container->get(ActionResolver::class),
            );
        });

        $this->container->singleton(ActionHeartbeat::class, function () {
            return new ActionHeartbeat(
                $this->container->get(ActionRepository::class),
            );
        });
    }

    public function boot(): void
    {
        add_action(ActionProcessor::HOOK, $this->container->callback(ActionProcessor::class, 'processReady'));
        add_filter('heartbeat_received', $this->container->callback(ActionHeartbeat::class, 'handle'), 10, 2);

        // Deferred to `init` because Action Scheduler registers its API
        // functions (as_has_scheduled_action, etc.) on that hook.
        if (is_admin() || (defined('WP_CLI') && WP_CLI)) {
            add_action('init', $this->container->callback(ActionProcessor::class, 'ensureScheduled'));
        }
    }
}
