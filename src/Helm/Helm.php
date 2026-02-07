<?php

declare(strict_types=1);

namespace Helm;

// Prevent direct access.
if (! defined('ABSPATH')) {
    exit;
}

use Helm\Anomalies\Provider as AnomaliesProvider;
use Helm\Celestials\Provider as CelestialsProvider;
use Helm\CLI\Provider as CLIProvider;
use Helm\Config\Provider as ConfigProvider;
use Helm\Database\Provider as DatabaseProvider;
use Helm\Discovery\Provider as DiscoveryProvider;
use Helm\Generation\Provider as GenerationProvider;
use Helm\Inventory\Provider as InventoryProvider;
use Helm\lucatume\DI52\Container;
use Helm\Navigation\Provider as NavigationProvider;
use Helm\Origin\Provider as OriginProvider;
use Helm\Planets\Provider as PlanetsProvider;
use Helm\Products\Provider as ProductsProvider;
use Helm\PostTypes\Provider as PostTypesProvider;
use Helm\Rest\Provider as RestProvider;
use Helm\ShipLink\Provider as ShipLinkProvider;
use Helm\Stars\Provider as StarsProvider;
use Helm\Stations\Provider as StationsProvider;
use Helm\View\Provider as ViewProvider;

/**
 * Helm - Space Exploration on WordPress.
 *
 * The core API for interaction with the Helm plugin.
 *
 * @method mixed setVar(string $key, mixed $value)
 * @method mixed getVar(string $key, mixed $default = null)
 * @method mixed get(string $id)
 * @method mixed make(string $id)
 * @method bool has(string $id)
 * @method void bind(string $id, mixed $implementation = null, array $afterBuildMethods = null)
 * @method mixed singleton(string $id, mixed $implementation = null, array $afterBuildMethods = null)
 * @method mixed register(string $serviceProviderClass, string $alias = null)
 * @method bool isBound(string $id)
 */
final class Helm
{
    private Container $container;

    /**
     * Service providers to load.
     *
     * @var class-string[]
     */
    private array $serviceProviders = [
        CLIProvider::class,
        ConfigProvider::class,
        DatabaseProvider::class,
        DiscoveryProvider::class,
        GenerationProvider::class,
        InventoryProvider::class,
        NavigationProvider::class,
        OriginProvider::class,
        PlanetsProvider::class,
        PostTypesProvider::class,
        ProductsProvider::class,
        RestProvider::class,
        ShipLinkProvider::class,
        StarsProvider::class,
        CelestialsProvider::class,
        StationsProvider::class,
        AnomaliesProvider::class,
        ViewProvider::class,
    ];

    /**
     * Whether providers have been loaded.
     */
    private bool $haveProvidersLoaded = false;

    public function __construct()
    {
        $this->container = new Container();
    }

    /**
     * Initialize Helm when WordPress initializes.
     */
    public function init(): void
    {
        $this->loadServiceProviders();

        do_action('helm_init');
    }

    /**
     * Bootstrap the Helm plugin.
     */
    public function boot(string $pluginFile): void
    {
        $this->setupConstants($pluginFile);

        add_action('plugins_loaded', [$this, 'init'], 0);
    }

    /**
     * Load all service providers.
     */
    private function loadServiceProviders(): void
    {
        if ($this->haveProvidersLoaded) {
            return;
        }

        foreach ($this->serviceProviders as $provider) {
            $this->container->register($provider);
        }

        $this->container->boot();

        $this->haveProvidersLoaded = true;
    }

    /**
     * Setup plugin constants.
     */
    private function setupConstants(string $pluginFile): void
    {
        if (! defined('HELM_VERSION')) {
            define('HELM_VERSION', '0.1.0');
        }

        if (! defined('HELM_FILE')) {
            define('HELM_FILE', $pluginFile);
        }

        if (! defined('HELM_PATH')) {
            define('HELM_PATH', plugin_dir_path($pluginFile));
        }

        if (! defined('HELM_URL')) {
            define('HELM_URL', plugin_dir_url($pluginFile));
        }

        if (! defined('HELM_BASENAME')) {
            define('HELM_BASENAME', plugin_basename($pluginFile));
        }
    }

    /**
     * Get the service container.
     */
    public function getContainer(): Container
    {
        return $this->container;
    }

    /**
     * Magic method to proxy calls to the container.
     *
     * @param string $name
     * @param array<mixed> $arguments
     * @return mixed
     */
    public function __call(string $name, array $arguments): mixed
    {
        return call_user_func_array([$this->container, $name], $arguments);
    }
}
