<?php

declare(strict_types=1);

namespace Helm\PostTypes;

use Helm\lucatume\DI52\ServiceProvider;

/**
 * Service provider for Custom Post Types.
 *
 * This provider must be loaded before other providers that depend on CPTs.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(PostTypeRegistry::class, function () {
            return new PostTypeRegistry();
        });
    }

    public function boot(): void
    {
        add_action('init', [$this, 'registerPostTypesAndTaxonomies'], 5);
    }

    /**
     * Register all post types and taxonomies.
     *
     * Runs at priority 5 to ensure CPTs are available before other init hooks.
     */
    public function registerPostTypesAndTaxonomies(): void
    {
        /** @var PostTypeRegistry $registry */
        $registry = $this->container->get(PostTypeRegistry::class);

        // Taxonomies must be registered before post types that use them
        $registry->registerTaxonomies();
        $registry->registerPostTypes();
    }
}
