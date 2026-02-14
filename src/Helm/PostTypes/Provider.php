<?php

declare(strict_types=1);

namespace Helm\PostTypes;

use Helm\Generation\SystemGenerator;
use Helm\lucatume\DI52\ServiceProvider;
use Helm\Origin\Origin;
use Helm\Planets\PlanetRepository;
use Helm\Stars\StarRepository;

/**
 * Service provider for Custom Post Types.
 *
 * This provider must be loaded before other providers that depend on CPTs.
 */
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(PostTypeRegistry::class);
        $this->container->singleton(TaxonomySeeder::class);
        $this->container->singleton(AdminColumns::class);
        $this->container->singleton(StarMetaBoxes::class);
    }

    public function boot(): void
    {
        add_action('init', $this->container->callback(PostTypeRegistry::class, 'registerAll'), 5);
        add_action('admin_init', $this->container->callback(AdminColumns::class, 'register'));
        add_action('admin_init', $this->container->callback(StarMetaBoxes::class, 'register'));
        add_action('admin_post_helm_generate_planets', [$this, 'handleGeneratePlanets']);
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
