<?php

declare(strict_types=1);

namespace Helm\Database;

use Helm\lucatume\DI52\ServiceProvider;
use Helm\PostTypes\TaxonomySeeder;
use Helm\Products\ProductSeeder;
use Helm\StellarWP\Models\Config as ModelsConfig;

/**
 * Database service provider.
 *
 * Handles database table creation on plugin activation.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(Schema::class);

        // Configure StellarWP Models library
        ModelsConfig::setHookPrefix('helm');
    }

    public function boot(): void
    {
        // Create tables and seed data on plugin activation
        register_activation_hook(HELM_FILE, function (bool $network_wide): void {
            Schema::createTables();
            $this->container->get(ProductSeeder::class)->seed();
            $this->container->get(TaxonomySeeder::class)->seed();
        });

        // Check for schema upgrades on admin init
        add_action('admin_init', [$this, 'maybeUpgradeSchema']);
    }

    /**
     * Check if schema needs upgrade and run it.
     */
    public function maybeUpgradeSchema(): void
    {
        if (Schema::needsUpgrade()) {
            Schema::createTables();
            $this->container->get(ProductSeeder::class)->seed();
            $this->container->get(TaxonomySeeder::class)->seed();
        }
    }
}
