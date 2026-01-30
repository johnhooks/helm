<?php

declare(strict_types=1);

namespace Helm\Planets;

use Helm\Generation\Generated\Planet as GeneratedPlanet;
use Helm\PostTypes\PostTypeRegistry;
use Helm\Stars\StarRepository;
use WP_Post;
use WP_Query;

/**
 * Repository for Planet CPT operations.
 */
final class PlanetRepository
{
    public function __construct(
        private readonly StarRepository $starRepository,
    ) {
    }

    /**
     * Get a planet by its unique ID.
     */
    public function get(string $planetId): ?PlanetPost
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_PLANET,
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'meta_query' => [
                [
                    'key' => PostTypeRegistry::META_PLANET_ID,
                    'value' => $planetId,
                ],
            ],
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        if (! $query->have_posts()) {
            return null;
        }

        return PlanetPost::fromPost($query->posts[0]);
    }

    /**
     * Get a planet by post ID.
     */
    public function getByPostId(int $postId): ?PlanetPost
    {
        return PlanetPost::fromId($postId);
    }

    /**
     * Save a Planet as a CPT.
     *
     * Creates a new post or updates existing one if planet ID already exists.
     */
    public function save(Planet $planet, ?int $starPostId = null): PlanetPost
    {
        $existing = $this->get($planet->id);

        if ($existing !== null) {
            return $this->update($existing->postId(), $planet);
        }

        return $this->create($planet, $starPostId);
    }

    /**
     * Save a Generated Planet as a CPT.
     *
     * Creates a new post or updates existing one if planet ID already exists.
     */
    public function saveGenerated(GeneratedPlanet $planet, string $starId, int $starPostId): PlanetPost
    {
        $existing = $this->get($planet->id);

        if ($existing !== null) {
            return $this->updateGenerated($existing->postId(), $planet, $starId);
        }

        return $this->createGenerated($planet, $starId, $starPostId);
    }

    /**
     * Create a new planet post.
     */
    private function create(Planet $planet, ?int $starPostId = null): PlanetPost
    {
        // Find the star post ID if not provided
        if ($starPostId === null) {
            $starPost = $this->starRepository->get($planet->starId);
            if ($starPost !== null) {
                $starPostId = $starPost->postId();
            }
        }

        $postId = wp_insert_post([
            'post_type' => PostTypeRegistry::POST_TYPE_PLANET,
            'post_status' => 'publish',
            'post_title' => $planet->displayName(),
            'post_parent' => $starPostId ?? 0,
        ], true);

        if (is_wp_error($postId)) {
            throw new \RuntimeException(
                sprintf('Failed to create planet post: %s', $postId->get_error_message())
            );
        }

        $this->saveMeta($postId, $planet);
        $this->saveTaxonomies($postId, $planet);

        $post = get_post($postId);
        return PlanetPost::fromPost($post);
    }

    /**
     * Create a new planet post from a generated planet.
     */
    private function createGenerated(GeneratedPlanet $planet, string $starId, int $starPostId): PlanetPost
    {
        $postId = wp_insert_post([
            'post_type' => PostTypeRegistry::POST_TYPE_PLANET,
            'post_status' => 'publish',
            'post_title' => $planet->name ?? $planet->id,
            'post_parent' => $starPostId,
        ], true);

        if (is_wp_error($postId)) {
            throw new \RuntimeException(
                sprintf('Failed to create planet post: %s', $postId->get_error_message())
            );
        }

        $this->saveGeneratedMeta($postId, $planet, $starId);
        $this->saveGeneratedTaxonomies($postId, $planet);

        $post = get_post($postId);
        return PlanetPost::fromPost($post);
    }

    /**
     * Update an existing planet post.
     */
    private function update(int $postId, Planet $planet): PlanetPost
    {
        wp_update_post([
            'ID' => $postId,
            'post_title' => $planet->displayName(),
        ]);

        $this->saveMeta($postId, $planet);
        $this->saveTaxonomies($postId, $planet);

        $post = get_post($postId);
        return PlanetPost::fromPost($post);
    }

    /**
     * Update an existing planet post from a generated planet.
     */
    private function updateGenerated(int $postId, GeneratedPlanet $planet, string $starId): PlanetPost
    {
        wp_update_post([
            'ID' => $postId,
            'post_title' => $planet->name ?? $planet->id,
        ]);

        $this->saveGeneratedMeta($postId, $planet, $starId);
        $this->saveGeneratedTaxonomies($postId, $planet);

        $post = get_post($postId);
        return PlanetPost::fromPost($post);
    }

    /**
     * Save planet metadata.
     */
    private function saveMeta(int $postId, Planet $planet): void
    {
        update_post_meta($postId, PostTypeRegistry::META_PLANET_ID, $planet->id);
        update_post_meta($postId, PostTypeRegistry::META_PLANET_STAR_ID, $planet->starId);
        update_post_meta($postId, PostTypeRegistry::META_PLANET_ORBIT_AU, $planet->orbitAu);
        update_post_meta($postId, PostTypeRegistry::META_PLANET_ORBIT_INDEX, $planet->orbitIndex);
        update_post_meta($postId, PostTypeRegistry::META_PLANET_HABITABLE, $planet->habitable ? '1' : '0');
        update_post_meta($postId, PostTypeRegistry::META_PLANET_CONFIRMED, $planet->confirmed ? '1' : '0');
        update_post_meta($postId, PostTypeRegistry::META_PLANET_MOONS, $planet->moons);

        if ($planet->radiusEarth !== null) {
            update_post_meta($postId, PostTypeRegistry::META_PLANET_RADIUS, $planet->radiusEarth);
        }

        if ($planet->massEarth !== null) {
            update_post_meta($postId, PostTypeRegistry::META_PLANET_MASS, $planet->massEarth);
        }

        if ($planet->resources !== []) {
            update_post_meta($postId, PostTypeRegistry::META_PLANET_RESOURCES, $planet->resources);
        }
    }

    /**
     * Save generated planet metadata.
     */
    private function saveGeneratedMeta(int $postId, GeneratedPlanet $planet, string $starId): void
    {
        update_post_meta($postId, PostTypeRegistry::META_PLANET_ID, $planet->id);
        update_post_meta($postId, PostTypeRegistry::META_PLANET_STAR_ID, $starId);
        update_post_meta($postId, PostTypeRegistry::META_PLANET_ORBIT_AU, $planet->orbitAu);
        update_post_meta($postId, PostTypeRegistry::META_PLANET_ORBIT_INDEX, $planet->orbitIndex);
        update_post_meta($postId, PostTypeRegistry::META_PLANET_HABITABLE, $planet->habitable ? '1' : '0');
        update_post_meta($postId, PostTypeRegistry::META_PLANET_CONFIRMED, $planet->confirmed ? '1' : '0');
        update_post_meta($postId, PostTypeRegistry::META_PLANET_MOONS, $planet->moons);

        if ($planet->radiusEarth !== null) {
            update_post_meta($postId, PostTypeRegistry::META_PLANET_RADIUS, $planet->radiusEarth);
        }

        if ($planet->massEarth !== null) {
            update_post_meta($postId, PostTypeRegistry::META_PLANET_MASS, $planet->massEarth);
        }

        if ($planet->resources !== []) {
            update_post_meta($postId, PostTypeRegistry::META_PLANET_RESOURCES, $planet->resources);
        }
    }

    /**
     * Save generated planet taxonomies.
     */
    private function saveGeneratedTaxonomies(int $postId, GeneratedPlanet $planet): void
    {
        // Set planet type taxonomy
        wp_set_object_terms($postId, $planet->type->value, PostTypeRegistry::TAXONOMY_PLANET_TYPE);
    }

    /**
     * Save planet taxonomies.
     */
    private function saveTaxonomies(int $postId, Planet $planet): void
    {
        // Set planet type taxonomy
        wp_set_object_terms($postId, $planet->type->value, PostTypeRegistry::TAXONOMY_PLANET_TYPE);
    }

    /**
     * Delete a planet by ID.
     */
    public function delete(string $planetId): bool
    {
        $planetPost = $this->get($planetId);

        if ($planetPost === null) {
            return false;
        }

        $result = wp_delete_post($planetPost->postId(), true);

        return $result !== false && $result !== null;
    }

    /**
     * Get all planets for a star.
     *
     * @return array<PlanetPost>
     */
    public function forStar(string $starId): array
    {
        $starPost = $this->starRepository->get($starId);

        if ($starPost === null) {
            return [];
        }

        return $this->forStarPostId($starPost->postId());
    }

    /**
     * Get all planets for a star by post ID.
     *
     * @return array<PlanetPost>
     */
    public function forStarPostId(int $starPostId): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_PLANET,
            'post_status' => 'publish',
            'post_parent' => $starPostId,
            'posts_per_page' => -1,
            'orderby' => 'meta_value_num',
            'meta_key' => PostTypeRegistry::META_PLANET_ORBIT_INDEX,
            'order' => 'ASC',
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(WP_Post $post) => PlanetPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Ensure planets exist for a star system.
     *
     * Creates planet posts from SystemContents if they don't already exist.
     * Returns existing planets if already created.
     *
     * @param \Helm\Generation\Generated\SystemContents $contents The generated system
     * @param string $starId The star's catalog ID
     * @param int $starPostId The star's WordPress post ID
     * @return array<PlanetPost> The planets (existing or newly created)
     */
    public function ensureSystemPlanetsExist(
        \Helm\Generation\Generated\SystemContents $contents,
        string $starId,
        int $starPostId
    ): array {
        $existing = $this->forStarPostId($starPostId);

        if ($existing !== []) {
            return $existing;
        }

        // Create planets from generated contents
        $planets = [];
        foreach ($contents->planets as $planet) {
            $planets[] = $this->saveGenerated($planet, $starId, $starPostId);
        }

        return $planets;
    }

    /**
     * Get all planets.
     *
     * @return array<PlanetPost>
     */
    public function all(int $limit = -1): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_PLANET,
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'orderby' => 'title',
            'order' => 'ASC',
            'no_found_rows' => $limit > 0,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(WP_Post $post) => PlanetPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Get habitable planets.
     *
     * @return array<PlanetPost>
     */
    public function habitable(int $limit = -1): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_PLANET,
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'meta_query' => [
                [
                    'key' => PostTypeRegistry::META_PLANET_HABITABLE,
                    'value' => '1',
                ],
            ],
            'orderby' => 'title',
            'order' => 'ASC',
            'no_found_rows' => $limit > 0,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(WP_Post $post) => PlanetPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Get planets by type.
     *
     * @return array<PlanetPost>
     */
    public function byType(string $type, int $limit = -1): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_PLANET,
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'tax_query' => [
                [
                    'taxonomy' => PostTypeRegistry::TAXONOMY_PLANET_TYPE,
                    'field' => 'slug',
                    'terms' => $type,
                ],
            ],
            'orderby' => 'title',
            'order' => 'ASC',
            'no_found_rows' => $limit > 0,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => true,
        ]);

        return array_map(
            fn(WP_Post $post) => PlanetPost::fromPost($post),
            $query->posts
        );
    }

    /**
     * Get the total count of planets.
     */
    public function count(): int
    {
        $counts = wp_count_posts(PostTypeRegistry::POST_TYPE_PLANET);
        return (int) ($counts->publish ?? 0);
    }

    /**
     * Check if a planet exists by ID.
     */
    public function exists(string $planetId): bool
    {
        return $this->get($planetId) !== null;
    }

    /**
     * Delete all planets for a star.
     */
    public function deleteForStar(string $starId): int
    {
        $planets = $this->forStar($starId);
        $deleted = 0;

        foreach ($planets as $planet) {
            if (wp_delete_post($planet->postId(), true)) {
                $deleted++;
            }
        }

        return $deleted;
    }
}
