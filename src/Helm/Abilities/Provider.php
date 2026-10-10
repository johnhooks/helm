<?php

declare(strict_types=1);

namespace Helm\Abilities;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Register player operations with the WordPress Abilities API.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(PlayerAbilities::class);
    }

    public function boot(): void
    {
        add_action('wp_abilities_api_categories_init', [$this, 'registerCategory']);
        add_action('wp_abilities_api_init', $this->container->callback(PlayerAbilities::class, 'register'));
    }

    public function registerCategory(): void
    {
        wp_register_ability_category('helm', [
            'label' => __('Helm', 'helm'),
            'description' => __('Operate your ships and explore known space.', 'helm'),
        ]);
    }
}
