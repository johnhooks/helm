<?php

declare(strict_types=1);

namespace Helm\Abilities;

use Helm\Abilities\Player\GetAction;
use Helm\Abilities\Player\InspectShip;
use Helm\Abilities\Player\Jump;
use Helm\Abilities\Player\ListKnownEdges;
use Helm\Abilities\Player\ListScanTargets;
use Helm\Abilities\Player\ListShips;
use Helm\Abilities\Player\ScanRoute;
use Helm\Abilities\System\GetProduct;
use Helm\Abilities\System\InspectSystem;
use Helm\Abilities\System\ListProducts;
use Helm\lucatume\DI52\ServiceProvider;

/**
 * Register player operations with the WordPress Abilities API.
 */
final class Provider extends ServiceProvider
{
    private const ABILITIES = [
        ListShips::class,
        InspectShip::class,
        ListScanTargets::class,
        ListKnownEdges::class,
        ScanRoute::class,
        Jump::class,
        GetAction::class,
        InspectSystem::class,
        ListProducts::class,
        GetProduct::class,
    ];

    public function register(): void
    {
        foreach (self::ABILITIES as $ability) {
            $this->container->singleton($ability);
        }
    }

    public function boot(): void
    {
        if (defined('HELM_MCP_ENABLED') && HELM_MCP_ENABLED && wp_get_environment_type() === 'local') {
            add_action('mcp_adapter_init', [new McpServer(), 'register']);
            add_filter('mcp_adapter_tool_call_result', [new McpServer(), 'formatError'], 10, 3);
        }

        add_action('wp_abilities_api_categories_init', [$this, 'registerCategory']);
        foreach (self::ABILITIES as $ability) {
            add_action('wp_abilities_api_init', $this->container->callback($ability, 'register'));
        }
    }

    public function registerCategory(): void
    {
        wp_register_ability_category('helm', [
            'label' => __('Helm', 'helm'),
            'description' => __('Operate your ships and explore known space.', 'helm'),
        ]);
    }
}
