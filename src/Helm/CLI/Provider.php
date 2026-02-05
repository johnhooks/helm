<?php

declare(strict_types=1);

namespace Helm\CLI;

use Helm\Config\Config;
use Helm\Generation\SystemGenerator;
use Helm\lucatume\DI52\ServiceProvider;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NavigationService;
use Helm\Navigation\NodeRepository;
use Helm\Origin\Origin;
use Helm\Planets\PlanetBatchGenerator;
use Helm\Planets\PlanetRepository;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\ActionRepository;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\ShipStateRepository;
use Helm\ShipLink\ShipSystemsRepository;
use Helm\Stars\StarBatchGenerator;
use Helm\Stars\StarCatalog;
use Helm\Stars\StarRepository;
use WP_CLI;

/**
 * Service provider for CLI commands.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(StarCommand::class, function () {
            return new StarCommand(
                $this->container->get(Config::class),
                $this->container->get(StarCatalog::class),
                $this->container->get(StarRepository::class),
                $this->container->get(PlanetRepository::class),
                $this->container->get(SystemGenerator::class),
                $this->container->get(Origin::class),
            );
        });

        $this->container->singleton(OriginCommand::class, function () {
            return new OriginCommand(
                $this->container->get(Origin::class),
            );
        });

        $this->container->singleton(StatusCommand::class, function () {
            return new StatusCommand(
                $this->container->get(Config::class),
                $this->container->get(Origin::class),
                $this->container->get(StarCatalog::class),
                $this->container->get(StarRepository::class),
                $this->container->get(PlanetRepository::class),
                $this->container->get(StarBatchGenerator::class),
                $this->container->get(PlanetBatchGenerator::class),
            );
        });

        $this->container->singleton(ShipCommand::class, function () {
            return new ShipCommand(
                $this->container->get(ShipFactory::class),
                $this->container->get(ShipStateRepository::class),
                $this->container->get(ShipSystemsRepository::class),
                $this->container->get(NodeRepository::class),
                $this->container->get(EdgeRepository::class),
                $this->container->get(NavigationService::class),
                $this->container->get(ActionFactory::class),
                $this->container->get(ActionRepository::class),
            );
        });

        $this->container->singleton(DbCommand::class, fn () => new DbCommand());

        $this->container->singleton(ActionCommand::class, function () {
            return new ActionCommand(
                $this->container->get(ActionProcessor::class),
                $this->container->get(ActionRepository::class),
            );
        });
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
