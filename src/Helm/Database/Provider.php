<?php

declare(strict_types=1);

namespace Helm\Database;

use Helm\lucatume\DI52\ServiceProvider;

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
    }

    public function boot(): void
    {
        // Create tables on plugin activation
        register_activation_hook(HELM_FILE, static function (bool $network_wide): void {
            Schema::createTables();
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
        }
    }
}
