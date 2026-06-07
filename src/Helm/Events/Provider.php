<?php

declare(strict_types=1);

namespace Helm\Events;

use Helm\Events\Contracts\EventDispatcher;
use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Helm domain events.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(EventDispatcher::class, Dispatcher::class);
        $this->container->singleton(Dispatcher::class);
    }
}
