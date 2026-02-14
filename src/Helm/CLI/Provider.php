<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\lucatume\DI52\ServiceProvider;
use WP_CLI;

/**
 * Service provider for CLI commands.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(StarCommand::class);
        $this->container->singleton(OriginCommand::class);
        $this->container->singleton(StatusCommand::class);
        $this->container->singleton(ShipCommand::class);
        $this->container->singleton(DbCommand::class);
        $this->container->singleton(ActionCommand::class);
    }

    public function boot(): void
    {
        if (! defined('WP_CLI') || ! WP_CLI) {
            return;
        }

        add_action('cli_init', [$this, 'registerCommands']);
    }

    /**
     * Register WP-CLI commands.
     */
    public function registerCommands(): void
    {
        WP_CLI::add_command('helm origin', $this->container->get(OriginCommand::class));
        WP_CLI::add_command('helm star', $this->container->get(StarCommand::class));
        WP_CLI::add_command('helm status', $this->container->get(StatusCommand::class));
        WP_CLI::add_command('helm ship', $this->container->get(ShipCommand::class));
        WP_CLI::add_command('helm db', $this->container->get(DbCommand::class));
        WP_CLI::add_command('helm action', $this->container->get(ActionCommand::class));
    }
}
