<?php

declare(strict_types=1);

namespace Helm\Stations;

use Helm\PostTypes\PostTypeRegistry;

/**
 * Repository for station posts.
 */
final class StationRepository
{
    /**
     * Find a station by post ID.
     */
    public function get(int $postId): ?StationPost
    {
        return StationPost::fromId($postId);
    }

    /**
     * Find stations by owner.
     *
     * @return StationPost[]
     */
    public function findByOwner(int $userId): array
    {
        $posts = get_posts([
            'post_type' => PostTypeRegistry::POST_TYPE_STATION,
            'author' => $userId,
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);

        return array_map(fn($post) => new StationPost($post), $posts);
    }

    /**
     * Find stations by type.
     *
     * @return StationPost[]
     */
    public function findByType(string $type): array
    {
        $posts = get_posts([
            'post_type' => PostTypeRegistry::POST_TYPE_STATION,
            'tax_query' => [
                [
                    'taxonomy' => PostTypeRegistry::TAXONOMY_STATION_TYPE,
                    'field' => 'slug',
                    'terms' => $type,
                ],
            ],
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);

        return array_map(fn($post) => new StationPost($post), $posts);
    }

    /**
     * Get all stations.
     *
     * @return StationPost[]
     */
    public function all(): array
    {
        $posts = get_posts([
            'post_type' => PostTypeRegistry::POST_TYPE_STATION,
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);

        return array_map(fn($post) => new StationPost($post), $posts);
    }

    /**
     * Create a station.
     *
     * @return int|false Post ID on success, false on failure
     */
    public function create(string $name, ?int $ownerId = null, ?string $type = null): int|false
    {
        $postData = [
            'post_type' => PostTypeRegistry::POST_TYPE_STATION,
            'post_title' => $name,
            'post_status' => 'publish',
        ];

        if ($ownerId !== null) {
            $postData['post_author'] = $ownerId;
        }

        $postId = wp_insert_post($postData, true);

        if (is_wp_error($postId) || $postId === 0) {
            return false;
        }

        if ($type !== null) {
            wp_set_object_terms($postId, $type, PostTypeRegistry::TAXONOMY_STATION_TYPE);
        }

        return $postId;
    }

    /**
     * Delete a station.
     */
    public function delete(int $postId): bool
    {
        $result = wp_delete_post($postId, true);
        return $result !== false && $result !== null;
    }

    /**
     * Count all stations.
     */
    public function count(): int
    {
        $counts = wp_count_posts(PostTypeRegistry::POST_TYPE_STATION);
        return (int) ($counts->publish ?? 0);
    }
}
