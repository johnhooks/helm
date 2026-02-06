<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\lucatume\DI52\ServiceProvider;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\LoadoutFactory;
use Helm\ShipLink\ShipStateRepository;

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

        $this->container->singleton(ShipController::class, function () {
            return new ShipController(
                $this->container->get(ShipStateRepository::class),
            );
        });

        $this->container->singleton(ShipSystemsController::class, function () {
            return new ShipSystemsController(
                $this->container->get(LoadoutFactory::class),
            );
        });
    }

    public function boot(): void
    {
        add_action('rest_api_init', function (): void {
            /** @var ShipActionsController $actionsController */
            $actionsController = $this->container->get(ShipActionsController::class);
            $actionsController->register();

            /** @var ShipController $shipController */
            $shipController = $this->container->get(ShipController::class);
            $shipController->register();

            /** @var ShipSystemsController $systemsController */
            $systemsController = $this->container->get(ShipSystemsController::class);
            $systemsController->register();
        });
    }
}
