<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\lucatume\DI52\ServiceProvider;
use Helm\ShipLink\ActionFactory;

/**
 * Service provider for REST API controllers.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(ShipActionsController::class, function () {
            return new ShipActionsController(
                $this->container->get(ActionFactory::class),
            );
        });
    }

    public function boot(): void
    {
        add_action('rest_api_init', function (): void {
            /** @var ShipActionsController $controller */
            $controller = $this->container->get(ShipActionsController::class);
            $controller->register();
        });
    }
}
