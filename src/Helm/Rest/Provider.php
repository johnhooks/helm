<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Celestials\CelestialService;
use Helm\Inventory\InventoryRepository;
use Helm\lucatume\DI52\ServiceProvider;
use Helm\Navigation\NodeRepository;
use Helm\Products\ProductRepository;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ShipFactory;

/**
 * Service provider for REST API controllers.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(ProductsController::class, function () {
            return new ProductsController(
                $this->container->get(ProductRepository::class),
            );
        });

        $this->container->singleton(ShipActionsController::class, function () {
            return new ShipActionsController(
                $this->container->get(ActionFactory::class),
            );
        });

        $this->container->singleton(ShipController::class, function () {
            return new ShipController(
                $this->container->get(ShipFactory::class),
            );
        });

        $this->container->singleton(ShipSystemsController::class, function () {
            return new ShipSystemsController(
                $this->container->get(InventoryRepository::class),
            );
        });

        $this->container->singleton(CelestialsController::class, function () {
            return new CelestialsController(
                $this->container->get(NodeRepository::class),
                $this->container->get(CelestialService::class),
            );
        });
    }

    public function boot(): void
    {
        add_action('rest_api_init', function (): void {
            /** @var ProductsController $productsController */
            $productsController = $this->container->get(ProductsController::class);
            $productsController->register();

            /** @var ShipActionsController $actionsController */
            $actionsController = $this->container->get(ShipActionsController::class);
            $actionsController->register();

            /** @var ShipController $shipController */
            $shipController = $this->container->get(ShipController::class);
            $shipController->register();

            /** @var ShipSystemsController $systemsController */
            $systemsController = $this->container->get(ShipSystemsController::class);
            $systemsController->register();

            /** @var CelestialsController $celestialsController */
            $celestialsController = $this->container->get(CelestialsController::class);
            $celestialsController->register();
        });
    }
}
