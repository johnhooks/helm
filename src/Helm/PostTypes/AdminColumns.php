<?php

declare(strict_types=1);

namespace Helm\PostTypes;

/**
 * Custom admin columns for Helm post types.
 *
 * Adds useful data columns to the post list tables in wp-admin.
 */
final class AdminColumns
{
    /**
     * Register all admin column hooks.
     */
    public function register(): void
    {
        // Star columns
        add_filter('manage_' . PostTypeRegistry::POST_TYPE_STAR . '_posts_columns', [$this, 'starColumns']);
        add_action('manage_' . PostTypeRegistry::POST_TYPE_STAR . '_posts_custom_column', [$this, 'starColumnContent'], 10, 2);
        add_filter('manage_edit-' . PostTypeRegistry::POST_TYPE_STAR . '_sortable_columns', [$this, 'starSortableColumns']);

        // Planet columns
        add_filter('manage_' . PostTypeRegistry::POST_TYPE_PLANET . '_posts_columns', [$this, 'planetColumns']);
        add_action('manage_' . PostTypeRegistry::POST_TYPE_PLANET . '_posts_custom_column', [$this, 'planetColumnContent'], 10, 2);
        add_filter('manage_edit-' . PostTypeRegistry::POST_TYPE_PLANET . '_sortable_columns', [$this, 'planetSortableColumns']);

        // Ship columns
        add_filter('manage_' . PostTypeRegistry::POST_TYPE_SHIP . '_posts_columns', [$this, 'shipColumns']);
        add_action('manage_' . PostTypeRegistry::POST_TYPE_SHIP . '_posts_custom_column', [$this, 'shipColumnContent'], 10, 2);
        add_filter('manage_edit-' . PostTypeRegistry::POST_TYPE_SHIP . '_sortable_columns', [$this, 'shipSortableColumns']);

        // Handle sorting
        add_action('pre_get_posts', [$this, 'handleSorting']);
    }

    /**
     * Define Star columns.
     *
     * @param array<string, string> $columns
     * @return array<string, string>
     */
    public function starColumns(array $columns): array
    {
        $newColumns = [];

        foreach ($columns as $key => $label) {
            $newColumns[$key] = $label;

            // Add custom columns after title
            if ($key === 'title') {
                $newColumns['catalog_id'] = __('Catalog ID', 'helm');
                $newColumns['distance'] = __('Distance (ly)', 'helm');
                $newColumns['spectral'] = __('Spectral Type', 'helm');
            }
        }

        return $newColumns;
    }

    /**
     * Render Star column content.
     */
    public function starColumnContent(string $column, int $postId): void
    {
        switch ($column) {
            case 'catalog_id':
                $catalogId = get_post_meta($postId, PostTypeRegistry::META_STAR_CATALOG_ID, true);
                echo esc_html($catalogId !== '' ? $catalogId : '—');
                break;

            case 'distance':
                $distance = get_post_meta($postId, PostTypeRegistry::META_STAR_DISTANCE_LY, true);
                if ($distance !== '' && $distance !== false) {
                    echo esc_html(number_format((float) $distance, 2));
                } else {
                    echo '—';
                }
                break;

            case 'spectral':
                $spectral = get_post_meta($postId, PostTypeRegistry::META_STAR_SPECTRAL_TYPE, true);
                echo esc_html($spectral !== '' ? $spectral : '—');
                break;
        }
    }

    /**
     * Define sortable Star columns.
     *
     * @param array<string, string> $columns
     * @return array<string, string>
     */
    public function starSortableColumns(array $columns): array
    {
        $columns['distance'] = 'distance';
        $columns['spectral'] = 'spectral';
        return $columns;
    }

    /**
     * Define Planet columns.
     *
     * @param array<string, string> $columns
     * @return array<string, string>
     */
    public function planetColumns(array $columns): array
    {
        $newColumns = [];

        foreach ($columns as $key => $label) {
            $newColumns[$key] = $label;

            // Add custom columns after title
            if ($key === 'title') {
                $newColumns['star'] = __('Star', 'helm');
                $newColumns['orbit'] = __('Orbit (AU)', 'helm');
                $newColumns['habitable'] = __('Habitable', 'helm');
            }
        }

        return $newColumns;
    }

    /**
     * Render Planet column content.
     */
    public function planetColumnContent(string $column, int $postId): void
    {
        switch ($column) {
            case 'star':
                $post = get_post($postId);
                if ($post !== null && $post->post_parent > 0) {
                    $starPost = get_post($post->post_parent);
                    if ($starPost !== null) {
                        $editLink = get_edit_post_link($post->post_parent);
                        if ($editLink !== null) {
                            printf(
                                '<a href="%s">%s</a>',
                                esc_url($editLink),
                                esc_html($starPost->post_title)
                            );
                        } else {
                            echo esc_html($starPost->post_title);
                        }
                    } else {
                        echo '—';
                    }
                } else {
                    echo '—';
                }
                break;

            case 'orbit':
                $orbit = get_post_meta($postId, PostTypeRegistry::META_PLANET_ORBIT_AU, true);
                if ($orbit !== '' && $orbit !== false) {
                    echo esc_html(number_format((float) $orbit, 2));
                } else {
                    echo '—';
                }
                break;

            case 'habitable':
                $habitable = get_post_meta($postId, PostTypeRegistry::META_PLANET_HABITABLE, true);
                echo (bool) $habitable ? esc_html__('Yes', 'helm') : '—';
                break;
        }
    }

    /**
     * Define sortable Planet columns.
     *
     * @param array<string, string> $columns
     * @return array<string, string>
     */
    public function planetSortableColumns(array $columns): array
    {
        $columns['orbit'] = 'orbit';
        $columns['star'] = 'star';
        return $columns;
    }

    /**
     * Define Ship columns.
     *
     * @param array<string, string> $columns
     * @return array<string, string>
     */
    public function shipColumns(array $columns): array
    {
        $newColumns = [];

        foreach ($columns as $key => $label) {
            $newColumns[$key] = $label;

            // Add custom columns after title
            if ($key === 'title') {
                $newColumns['location'] = __('Location', 'helm');
                $newColumns['credits'] = __('Credits', 'helm');
                $newColumns['fuel'] = __('Fuel', 'helm');
            }
        }

        return $newColumns;
    }

    /**
     * Render Ship column content.
     */
    public function shipColumnContent(string $column, int $postId): void
    {
        switch ($column) {
            case 'location':
                $location = get_post_meta($postId, PostTypeRegistry::META_SHIP_LOCATION, true);
                echo esc_html($location !== '' ? $location : '—');
                break;

            case 'credits':
                $credits = get_post_meta($postId, PostTypeRegistry::META_SHIP_CREDITS, true);
                if ($credits !== '' && $credits !== false) {
                    echo esc_html(number_format((int) $credits));
                } else {
                    echo '—';
                }
                break;

            case 'fuel':
                $fuel = get_post_meta($postId, PostTypeRegistry::META_SHIP_FUEL, true);
                if ($fuel !== '' && $fuel !== false) {
                    echo esc_html(number_format((float) $fuel, 1) . '%');
                } else {
                    echo '—';
                }
                break;
        }
    }

    /**
     * Define sortable Ship columns.
     *
     * @param array<string, string> $columns
     * @return array<string, string>
     */
    public function shipSortableColumns(array $columns): array
    {
        $columns['credits'] = 'credits';
        $columns['fuel'] = 'fuel';
        return $columns;
    }

    /**
     * Handle sorting by custom columns.
     */
    public function handleSorting(\WP_Query $query): void
    {
        if (! is_admin() || ! $query->is_main_query()) {
            return;
        }

        $orderby = $query->get('orderby');

        switch ($orderby) {
            case 'distance':
                $query->set('meta_key', PostTypeRegistry::META_STAR_DISTANCE_LY);
                $query->set('orderby', 'meta_value_num');
                break;

            case 'spectral':
                $query->set('meta_key', PostTypeRegistry::META_STAR_SPECTRAL_TYPE);
                $query->set('orderby', 'meta_value');
                break;

            case 'orbit':
                $query->set('meta_key', PostTypeRegistry::META_PLANET_ORBIT_AU);
                $query->set('orderby', 'meta_value_num');
                break;

            case 'star':
                $query->set('orderby', 'parent');
                break;

            case 'credits':
                $query->set('meta_key', PostTypeRegistry::META_SHIP_CREDITS);
                $query->set('orderby', 'meta_value_num');
                break;

            case 'fuel':
                $query->set('meta_key', PostTypeRegistry::META_SHIP_FUEL);
                $query->set('orderby', 'meta_value_num');
                break;
        }
    }
}
