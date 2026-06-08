<?php

declare(strict_types=1);

namespace Helm\Broadcasting;

use Helm\Broadcasting\Contracts\EventRepository;
use Helm\Events\Dispatcher;
use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for broadcast delivery components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(EventRepository::class, WpdbEventRepository::class);
        $this->container->singleton(Broadcaster::class);
        $this->container->singleton(Heartbeat::class);
    }

    public function boot(): void
    {
        add_action(Dispatcher::HOOK, $this->container->callback(Broadcaster::class, 'handleEvent'));
        add_filter('heartbeat_received', $this->container->callback(Heartbeat::class, 'handle'), 10, 2);
    }
}
