<?php

declare(strict_types=1);

namespace Helm\PostTypes;

use Helm\Celestials\CelestialRepository;
use Helm\Celestials\CelestialType;
use Helm\Discovery\DiscoveryService;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Origin\Origin;
use Helm\Planets\PlanetRepository;
use Helm\Stars\StarRepository;
use Helm\View\View;

/**
 * Meta boxes for the Star CPT edit screen.
 *
 * Displays star properties, system contents, and discovery info.
 */
final class StarMetaBoxes
{
    public function __construct(
        private readonly View $view,
        private readonly StarRepository $starRepository,
        private readonly PlanetRepository $planetRepository,
        private readonly DiscoveryService $discoveryService,
        private readonly NodeRepository $nodeRepository,
        private readonly CelestialRepository $celestialRepository,
        private readonly Origin $origin,
    ) {
    }

    /**
     * Register meta boxes.
     */
    public function register(): void
    {
        add_action('add_meta_boxes', [$this, 'addMetaBoxes']);
    }

    /**
     * Add meta boxes to the star edit screen.
     */
    public function addMetaBoxes(): void
    {
        add_meta_box(
            'helm_star_properties',
            __('Star Properties', 'helm'),
            [$this, 'renderProperties'],
            PostTypeRegistry::POST_TYPE_STAR,
            'normal',
            'high'
        );

        add_meta_box(
            'helm_star_system',
            __('System Contents', 'helm'),
            [$this, 'renderSystem'],
            PostTypeRegistry::POST_TYPE_STAR,
            'normal',
            'default'
        );

        add_meta_box(
            'helm_star_discovery',
            __('Discovery', 'helm'),
            [$this, 'renderDiscovery'],
            PostTypeRegistry::POST_TYPE_STAR,
            'side',
            'default'
        );

        add_meta_box(
            'helm_star_navigation',
            __('Navigation', 'helm'),
            [$this, 'renderNavigation'],
            PostTypeRegistry::POST_TYPE_STAR,
            'side',
            'default'
        );
    }

    /**
     * Render star properties meta box.
     */
    public function renderProperties(\WP_Post $post): void
    {
        $starPost = $this->starRepository->getByPostId($post->ID);
        if ($starPost === null) {
            echo '<p>' . esc_html__('Star data not found.', 'helm') . '</p>';
            return;
        }

        $this->view->render('admin/metaboxes/star-properties', [
            'star' => $starPost->toStar(),
        ]);
    }

    /**
     * Render system contents meta box.
     */
    public function renderSystem(\WP_Post $post): void
    {
        $planets = $this->planetRepository->forStarPostId($post->ID);

        $generateUrl = null;
        if ($this->origin->isInitialized()) {
            $generateUrl = wp_nonce_url(
                admin_url('admin-post.php?action=helm_generate_planets&star_id=' . $post->ID),
                'helm_generate_planets_' . $post->ID
            );
        }

        $this->view->render('admin/metaboxes/star-system', [
            'planets' => $planets,
            'originInitialized' => $this->origin->isInitialized(),
            'generateUrl' => $generateUrl,
        ]);
    }

    /**
     * Render discovery meta box.
     */
    public function renderDiscovery(\WP_Post $post): void
    {
        $catalogId = get_post_meta($post->ID, PostTypeRegistry::META_STAR_CATALOG_ID, true);
        if ($catalogId === '' || $catalogId === false) {
            echo '<p>' . esc_html__('No catalog ID found.', 'helm') . '</p>';
            return;
        }

        $this->view->render('admin/metaboxes/star-discovery', [
            'isDiscovered' => $this->discoveryService->isDiscovered($catalogId),
            'count' => $this->discoveryService->getDiscoveryCount($catalogId),
            'isKnownSpace' => $this->discoveryService->isKnownSpace($catalogId),
            'firstDiscoverer' => $this->discoveryService->getFirstDiscoverer($catalogId),
        ]);
    }

    /**
     * Render navigation meta box.
     */
    public function renderNavigation(\WP_Post $post): void
    {
        $starPost = $this->starRepository->getByPostId($post->ID);
        if ($starPost === null) {
            echo '<p>' . esc_html__('Star data not found.', 'helm') . '</p>';
            return;
        }

        $celestial = $this->celestialRepository->findByContent(CelestialType::Star, $post->ID);
        $node = $celestial !== null ? $this->nodeRepository->get($celestial->nodeId) : null;

        $this->view->render('admin/metaboxes/star-navigation', [
            'nodeId' => $node?->id,
            'coords' => $starPost->toStar()->cartesian3D(),
        ]);
    }
}
