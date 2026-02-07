<?php

declare(strict_types=1);

namespace Helm\PostTypes;

use Helm\Discovery\DiscoveryService;
use Helm\Generation\SystemGenerator;
use Helm\lucatume\DI52\ServiceProvider;
use Helm\Navigation\NodeRepository;
use Helm\Origin\Origin;
use Helm\Planets\PlanetRepository;
use Helm\Stars\StarRepository;
use Helm\View\View;

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

        $this->container->singleton(TaxonomySeeder::class, function () {
            return new TaxonomySeeder();
        });

        $this->container->singleton(AdminColumns::class, function () {
            return new AdminColumns();
        });

        $this->container->singleton(StarMetaBoxes::class, function () {
            return new StarMetaBoxes(
                $this->container->get(View::class),
                $this->container->get(StarRepository::class),
                $this->container->get(PlanetRepository::class),
                $this->container->get(DiscoveryService::class),
                $this->container->get(NodeRepository::class),
                $this->container->get(Origin::class),
            );
        });
    }

    public function boot(): void
    {
        add_action('init', [$this, 'registerPostTypesAndTaxonomies'], 5);
        add_action('admin_init', [$this, 'registerAdminColumns']);
        add_action('admin_init', [$this, 'registerMetaBoxes']);
        add_action('admin_post_helm_generate_planets', [$this, 'handleGeneratePlanets']);
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

    /**
     * Register admin column customizations.
     */
    public function registerAdminColumns(): void
    {
        /** @var AdminColumns $columns */
        $columns = $this->container->get(AdminColumns::class);
        $columns->register();
    }

    /**
     * Register meta boxes for CPT edit screens.
     */
    public function registerMetaBoxes(): void
    {
        /** @var StarMetaBoxes $starMetaBoxes */
        $starMetaBoxes = $this->container->get(StarMetaBoxes::class);
        $starMetaBoxes->register();
    }

    /**
     * Handle the generate planets admin action.
     */
    public function handleGeneratePlanets(): void
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Nonce verified below
        $starPostId = isset($_GET['star_id']) ? absint(wp_unslash($_GET['star_id'])) : 0;

        if ($starPostId <= 0) {
            wp_die(esc_html__('Invalid star ID.', 'helm'));
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- We're checking it right here
        $nonce = isset($_GET['_wpnonce']) ? sanitize_text_field(wp_unslash($_GET['_wpnonce'])) : '';
        if (! wp_verify_nonce($nonce, 'helm_generate_planets_' . $starPostId)) {
            wp_die(esc_html__('Security check failed.', 'helm'));
        }

        if (! current_user_can('edit_post', $starPostId)) {
            wp_die(esc_html__('You do not have permission to do this.', 'helm'));
        }

        /** @var StarRepository $starRepository */
        $starRepository = $this->container->get(StarRepository::class);
        $starPost = $starRepository->getByPostId($starPostId);

        if ($starPost === null) {
            wp_die(esc_html__('Star not found.', 'helm'));
        }

        /** @var Origin $origin */
        $origin = $this->container->get(Origin::class);
        if (! $origin->isInitialized()) {
            wp_die(esc_html__('Origin not initialized.', 'helm'));
        }

        /** @var SystemGenerator $generator */
        $generator = $this->container->get(SystemGenerator::class);
        $star = $starPost->toStar();
        $contents = $generator->generate($star, $origin->config()->masterSeed);

        /** @var PlanetRepository $planetRepository */
        $planetRepository = $this->container->get(PlanetRepository::class);
        $planetRepository->ensureSystemPlanetsExist($contents, $star->id, $starPostId);

        wp_safe_redirect(get_edit_post_link($starPostId, 'raw'));
        exit;
    }
}
