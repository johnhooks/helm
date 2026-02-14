<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for REST API controllers.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(ProductsController::class);
        $this->container->singleton(ShipActionsController::class);
        $this->container->singleton(ShipController::class);
        $this->container->singleton(ShipSystemsController::class);
        $this->container->singleton(NodesController::class);
    }

    public function boot(): void
    {
        add_action('rest_api_init', $this->container->callback(ProductsController::class, 'register'));
        add_action('rest_api_init', $this->container->callback(ShipActionsController::class, 'register'));
        add_action('rest_api_init', $this->container->callback(ShipController::class, 'register'));
        add_action('rest_api_init', $this->container->callback(ShipSystemsController::class, 'register'));
        add_action('rest_api_init', $this->container->callback(NodesController::class, 'register'));
    }
}
