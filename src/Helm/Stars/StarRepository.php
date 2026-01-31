<?php

declare(strict_types=1);

namespace Helm\Stars;

use Helm\PostTypes\PostTypeRegistry;
use WP_Post;
use WP_Query;

/**
 * Repository for Star CPT operations.
 */
final class StarRepository
{
    /**
     * Get a star by its catalog ID.
     */
    public function get(string $catalogId): ?StarPost
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_STAR,
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'meta_query' => [
                [
                    'key' => PostTypeRegistry::META_STAR_CATALOG_ID,
                    'value' => $catalogId,
                ],
            ],
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        if (! $query->have_posts()) {
            return null;
        }

        return StarPost::fromPost($query->posts[0]);
    }

    /**
     * Get a star by post ID.
     */
    public function getByPostId(int $postId): ?StarPost
    {
        return StarPost::fromId($postId);
    }

    /**
     * Get multiple stars by post IDs (batch load).
     *
     * @param int[] $postIds
     * @return array<int, StarPost> Map of postId => StarPost
     */
    public function findByPostIds(array $postIds): array
    {
        if ($postIds === []) {
            return [];
        }

        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_STAR,
            'post_status' => 'publish',
            'post__in' => $postIds,
            'posts_per_page' => count($postIds),
            'orderby' => 'post__in',
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        $map = [];
        foreach ($query->posts as $post) {
            $map[$post->ID] = StarPost::fromPost($post);
        }

        return $map;
    }

    /**
     * Save a Star as a CPT.
     *
     * Creates a new post or updates existing one if catalog ID already exists.
     */
    public function save(Star $star): StarPost
    {
        $existing = $this->get($star->id);

        if ($existing !== null) {
            return $this->update($existing->postId(), $star);
        }

        return $this->create($star);
    }

    /**
     * Create a new star post.
     */
    private function create(Star $star): StarPost
    {
        $postId = wp_insert_post([
            'post_type' => PostTypeRegistry::POST_TYPE_STAR,
            'post_status' => 'publish',
            'post_title' => $star->displayName(),
        ], true);

        if (is_wp_error($postId)) {
            throw new \RuntimeException(
                sprintf('Failed to create star post: %s', $postId->get_error_message())
            );
        }

        $this->saveMeta($postId, $star);
        $this->saveTaxonomies($postId, $star);

        $post = get_post($postId);
        $starPost = StarPost::fromPost($post);

        /**
         * Fires when a new star post is created.
         *
         * Used by Navigation to create the corresponding nav_node.
         *
         * @param StarPost $starPost The created star post adapter.
         * @param Star $star The source star value object.
         */
        do_action('helm_star_created', $starPost, $star);

        return $starPost;
    }

    /**
     * Update an existing star post.
     */
    private function update(int $postId, Star $star): StarPost
    {
        wp_update_post([
            'ID' => $postId,
            'post_title' => $star->displayName(),
        ]);

        $this->saveMeta($postId, $star);
        $this->saveTaxonomies($postId, $star);

        $post = get_post($postId);
        return StarPost::fromPost($post);
    }

    /**
     * Save star metadata.
     */
    private function saveMeta(int $postId, Star $star): void
    {
        update_post_meta($postId, PostTypeRegistry::META_STAR_CATALOG_ID, $star->id);
        update_post_meta($postId, PostTypeRegistry::META_STAR_DISTANCE_LY, $star->distanceLy);
        update_post_meta($postId, PostTypeRegistry::META_STAR_SPECTRAL_TYPE, $star->spectralType);
        update_post_meta($postId, PostTypeRegistry::META_STAR_RA, $star->ra);
        update_post_meta($postId, PostTypeRegistry::META_STAR_DEC, $star->dec);

        if ($star->luminosity() !== null) {
            update_post_meta($postId, PostTypeRegistry::META_STAR_LUMINOSITY, $star->luminosity());
        }

        if ($star->properties !== []) {
            update_post_meta($postId, PostTypeRegistry::META_STAR_PROPERTIES, $star->properties);
        }

        if ($star->confirmedPlanets !== []) {
            update_post_meta($postId, PostTypeRegistry::META_STAR_CONFIRMED_PLANETS, $star->confirmedPlanets);
        }
    }

    /**
     * Save star taxonomies.
     */
    private function saveTaxonomies(int $postId, Star $star): void
    {
        // Set spectral class
        $spectralClass = $star->spectralClass();
        if ($spectralClass !== 'Unknown') {
            wp_set_object_terms($postId, $spectralClass, PostTypeRegistry::TAXONOMY_SPECTRAL_CLASS);
        }

        // Set constellation if available
        $constellation = $star->properties['constellation'] ?? null;
        if ($constellation !== null) {
            wp_set_object_terms($postId, $constellation, PostTypeRegistry::TAXONOMY_CONSTELLATION);
        }
    }

    /**
     * Delete a star by catalog ID.
     */
    public function delete(string $catalogId): bool
    {
        $starPost = $this->get($catalogId);

        if ($starPost === null) {
            return false;
        }

        $result = wp_delete_post($starPost->postId(), true);

        return $result !== false && $result !== null;
    }

    /**
     * Get all stars.
     *
     * @return array<StarPost>
     */
    public function all(int $limit = -1): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_STAR,
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'orderby' => 'title',
            'order' => 'ASC',
            'no_found_rows' => $limit > 0,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(WP_Post $post) => StarPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Get stars within a distance from Sol.
     *
     * @return array<StarPost>
     */
    public function inRange(float $maxDistanceLy, int $limit = -1): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_STAR,
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'meta_query' => [
                [
                    'key' => PostTypeRegistry::META_STAR_DISTANCE_LY,
                    'value' => $maxDistanceLy,
                    'compare' => '<=',
                    'type' => 'DECIMAL(10,4)',
                ],
            ],
            'orderby' => 'meta_value_num',
            'meta_key' => PostTypeRegistry::META_STAR_DISTANCE_LY,
            'order' => 'ASC',
            'no_found_rows' => $limit > 0,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(WP_Post $post) => StarPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Get stars by spectral class.
     *
     * @return array<StarPost>
     */
    public function bySpectralClass(string $class, int $limit = -1): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_STAR,
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'tax_query' => [
                [
                    'taxonomy' => PostTypeRegistry::TAXONOMY_SPECTRAL_CLASS,
                    'field' => 'name',
                    'terms' => $class,
                ],
            ],
            'orderby' => 'title',
            'order' => 'ASC',
            'no_found_rows' => $limit > 0,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(WP_Post $post) => StarPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Get stars by constellation.
     *
     * @return array<StarPost>
     */
    public function byConstellation(string $constellation, int $limit = -1): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_STAR,
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'tax_query' => [
                [
                    'taxonomy' => PostTypeRegistry::TAXONOMY_CONSTELLATION,
                    'field' => 'name',
                    'terms' => $constellation,
                ],
            ],
            'orderby' => 'title',
            'order' => 'ASC',
            'no_found_rows' => $limit > 0,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(WP_Post $post) => StarPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Get the total count of stars.
     */
    public function count(): int
    {
        $counts = wp_count_posts(PostTypeRegistry::POST_TYPE_STAR);
        return (int) ($counts->publish ?? 0);
    }

    /**
     * Check if a star exists by catalog ID.
     */
    public function exists(string $catalogId): bool
    {
        return $this->get($catalogId) !== null;
    }
}
