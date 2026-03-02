<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Lib\MethodInvoker;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for ShipLink components.
 *
 * Registers the ShipLink architecture: factory, resolver, repositories.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(ShipStateRepository::class, WpdbShipStateRepository::class);
        $this->container->singleton(ActionRepository::class, WpdbActionRepository::class);
        $this->container->singleton(Contracts\LoadoutFactory::class, WpdbLoadoutFactory::class);
        $this->container->singleton(ShipFactory::class);
        $this->container->singleton(MethodInvoker::class);
        $this->container->singleton(ActionFactory::class);
        $this->container->singleton(ActionResolver::class);
        $this->container->singleton(ActionProcessor::class);
        $this->container->singleton(ActionHeartbeat::class);
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
