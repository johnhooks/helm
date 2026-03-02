<?php

declare(strict_types=1);

namespace Helm\Inventory;

use Helm\Inventory\Contracts\InventoryRepository;
use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Inventory components.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(InventoryRepository::class, WpdbInventoryRepository::class);
    }
}
