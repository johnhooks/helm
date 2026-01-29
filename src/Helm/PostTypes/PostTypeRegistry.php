<?php

declare(strict_types=1);

namespace Helm\PostTypes;

/**
 * Central registry for all Helm custom post types and taxonomies.
 *
 * All CPT and taxonomy slugs are defined here as constants to ensure
 * consistency across the codebase.
 */
final class PostTypeRegistry
{
    // Post Types
    public const POST_TYPE_STAR = 'helm_star';
    public const POST_TYPE_PLANET = 'helm_planet';
    public const POST_TYPE_SHIP = 'helm_ship';

    // Taxonomies
    public const TAXONOMY_CONSTELLATION = 'helm_constellation';
    public const TAXONOMY_SPECTRAL_CLASS = 'helm_spectral_class';
    public const TAXONOMY_PLANET_TYPE = 'helm_planet_type';

    // Meta Keys - Stars
    public const META_STAR_CATALOG_ID = '_helm_star_id';
    public const META_STAR_DISTANCE_LY = '_helm_distance_ly';
    public const META_STAR_SPECTRAL_TYPE = '_helm_spectral_type';
    public const META_STAR_RA = '_helm_ra';
    public const META_STAR_DEC = '_helm_dec';
    public const META_STAR_LUMINOSITY = '_helm_luminosity_solar';
    public const META_STAR_PROPERTIES = '_helm_star_properties';
    public const META_STAR_CONFIRMED_PLANETS = '_helm_confirmed_planets';

    // Meta Keys - Planets
    public const META_PLANET_ID = '_helm_planet_id';
    public const META_PLANET_STAR_ID = '_helm_star_id';
    public const META_PLANET_ORBIT_AU = '_helm_orbit_au';
    public const META_PLANET_ORBIT_INDEX = '_helm_orbit_index';
    public const META_PLANET_RADIUS = '_helm_radius_earth';
    public const META_PLANET_MASS = '_helm_mass_earth';
    public const META_PLANET_HABITABLE = '_helm_habitable';
    public const META_PLANET_CONFIRMED = '_helm_confirmed';
    public const META_PLANET_MOONS = '_helm_moons';
    public const META_PLANET_RESOURCES = '_helm_resources';

    // Meta Keys - Ships
    public const META_SHIP_ID = '_helm_ship_id';
    public const META_SHIP_LOCATION = '_helm_location';
    public const META_SHIP_CREDITS = '_helm_credits';
    public const META_SHIP_CARGO = '_helm_cargo';
    public const META_SHIP_ARTIFACTS = '_helm_artifacts';

    /**
     * Register all custom post types.
     */
    public function registerPostTypes(): void
    {
        $this->registerStarPostType();
        $this->registerPlanetPostType();
        $this->registerShipPostType();
    }

    /**
     * Register all taxonomies.
     */
    public function registerTaxonomies(): void
    {
        $this->registerConstellationTaxonomy();
        $this->registerSpectralClassTaxonomy();
        $this->registerPlanetTypeTaxonomy();
    }

    /**
     * Register the Star post type.
     */
    private function registerStarPostType(): void
    {
        register_post_type(self::POST_TYPE_STAR, [
            'labels' => [
                'name' => __('Stars', 'helm'),
                'singular_name' => __('Star', 'helm'),
                'add_new' => __('Add New', 'helm'),
                'add_new_item' => __('Add New Star', 'helm'),
                'edit_item' => __('Edit Star', 'helm'),
                'new_item' => __('New Star', 'helm'),
                'view_item' => __('View Star', 'helm'),
                'search_items' => __('Search Stars', 'helm'),
                'not_found' => __('No stars found', 'helm'),
                'not_found_in_trash' => __('No stars found in Trash', 'helm'),
                'menu_name' => __('Stars', 'helm'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_position' => 30,
            'menu_icon' => 'dashicons-star-filled',
            'supports' => ['title'],
            'has_archive' => false,
            'rewrite' => false,
            'show_in_rest' => true,
            'rest_base' => 'stars',
        ]);
    }

    /**
     * Register the Planet post type.
     */
    private function registerPlanetPostType(): void
    {
        register_post_type(self::POST_TYPE_PLANET, [
            'labels' => [
                'name' => __('Planets', 'helm'),
                'singular_name' => __('Planet', 'helm'),
                'add_new' => __('Add New', 'helm'),
                'add_new_item' => __('Add New Planet', 'helm'),
                'edit_item' => __('Edit Planet', 'helm'),
                'new_item' => __('New Planet', 'helm'),
                'view_item' => __('View Planet', 'helm'),
                'search_items' => __('Search Planets', 'helm'),
                'not_found' => __('No planets found', 'helm'),
                'not_found_in_trash' => __('No planets found in Trash', 'helm'),
                'menu_name' => __('Planets', 'helm'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=' . self::POST_TYPE_STAR,
            'supports' => ['title'],
            'hierarchical' => true, // Allows post_parent for star relationship
            'has_archive' => false,
            'rewrite' => false,
            'show_in_rest' => true,
            'rest_base' => 'planets',
        ]);
    }

    /**
     * Register the Ship post type.
     */
    private function registerShipPostType(): void
    {
        register_post_type(self::POST_TYPE_SHIP, [
            'labels' => [
                'name' => __('Ships', 'helm'),
                'singular_name' => __('Ship', 'helm'),
                'add_new' => __('Add New', 'helm'),
                'add_new_item' => __('Add New Ship', 'helm'),
                'edit_item' => __('Edit Ship', 'helm'),
                'new_item' => __('New Ship', 'helm'),
                'view_item' => __('View Ship', 'helm'),
                'search_items' => __('Search Ships', 'helm'),
                'not_found' => __('No ships found', 'helm'),
                'not_found_in_trash' => __('No ships found in Trash', 'helm'),
                'menu_name' => __('Ships', 'helm'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_position' => 31,
            'menu_icon' => 'dashicons-airplane',
            'supports' => ['title'],
            'has_archive' => false,
            'rewrite' => false,
            'show_in_rest' => true,
            'rest_base' => 'ships',
        ]);
    }

    /**
     * Register the Constellation taxonomy.
     */
    private function registerConstellationTaxonomy(): void
    {
        register_taxonomy(self::TAXONOMY_CONSTELLATION, self::POST_TYPE_STAR, [
            'labels' => [
                'name' => __('Constellations', 'helm'),
                'singular_name' => __('Constellation', 'helm'),
                'search_items' => __('Search Constellations', 'helm'),
                'all_items' => __('All Constellations', 'helm'),
                'edit_item' => __('Edit Constellation', 'helm'),
                'update_item' => __('Update Constellation', 'helm'),
                'add_new_item' => __('Add New Constellation', 'helm'),
                'new_item_name' => __('New Constellation Name', 'helm'),
                'menu_name' => __('Constellations', 'helm'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'show_admin_column' => true,
            'hierarchical' => false,
            'rewrite' => false,
            'show_in_rest' => true,
        ]);
    }

    /**
     * Register the Spectral Class taxonomy.
     */
    private function registerSpectralClassTaxonomy(): void
    {
        register_taxonomy(self::TAXONOMY_SPECTRAL_CLASS, self::POST_TYPE_STAR, [
            'labels' => [
                'name' => __('Spectral Classes', 'helm'),
                'singular_name' => __('Spectral Class', 'helm'),
                'search_items' => __('Search Spectral Classes', 'helm'),
                'all_items' => __('All Spectral Classes', 'helm'),
                'edit_item' => __('Edit Spectral Class', 'helm'),
                'update_item' => __('Update Spectral Class', 'helm'),
                'add_new_item' => __('Add New Spectral Class', 'helm'),
                'new_item_name' => __('New Spectral Class Name', 'helm'),
                'menu_name' => __('Spectral Classes', 'helm'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'show_admin_column' => true,
            'hierarchical' => false,
            'rewrite' => false,
            'show_in_rest' => true,
        ]);
    }

    /**
     * Register the Planet Type taxonomy.
     */
    private function registerPlanetTypeTaxonomy(): void
    {
        register_taxonomy(self::TAXONOMY_PLANET_TYPE, self::POST_TYPE_PLANET, [
            'labels' => [
                'name' => __('Planet Types', 'helm'),
                'singular_name' => __('Planet Type', 'helm'),
                'search_items' => __('Search Planet Types', 'helm'),
                'all_items' => __('All Planet Types', 'helm'),
                'edit_item' => __('Edit Planet Type', 'helm'),
                'update_item' => __('Update Planet Type', 'helm'),
                'add_new_item' => __('Add New Planet Type', 'helm'),
                'new_item_name' => __('New Planet Type Name', 'helm'),
                'menu_name' => __('Planet Types', 'helm'),
            ],
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'show_admin_column' => true,
            'hierarchical' => false,
            'rewrite' => false,
            'show_in_rest' => true,
        ]);
    }

    /**
     * Get all post type slugs.
     *
     * @return array<string>
     */
    public static function getPostTypes(): array
    {
        return [
            self::POST_TYPE_STAR,
            self::POST_TYPE_PLANET,
            self::POST_TYPE_SHIP,
        ];
    }

    /**
     * Get all taxonomy slugs.
     *
     * @return array<string>
     */
    public static function getTaxonomies(): array
    {
        return [
            self::TAXONOMY_CONSTELLATION,
            self::TAXONOMY_SPECTRAL_CLASS,
            self::TAXONOMY_PLANET_TYPE,
        ];
    }
}
