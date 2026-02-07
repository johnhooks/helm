<?php

declare(strict_types=1);

namespace Helm\Anomalies;

use Helm\PostTypes\PostTypeRegistry;

/**
 * Repository for anomaly posts.
 */
final class AnomalyRepository
{
    /**
     * Find an anomaly by post ID.
     */
    public function get(int $postId): ?AnomalyPost
    {
        return AnomalyPost::fromId($postId);
    }

    /**
     * Find anomalies by type.
     *
     * @return AnomalyPost[]
     */
    public function findByType(string $type): array
    {
        $posts = get_posts([
            'post_type' => PostTypeRegistry::POST_TYPE_ANOMALY,
            'tax_query' => [
                [
                    'taxonomy' => PostTypeRegistry::TAXONOMY_ANOMALY_TYPE,
                    'field' => 'slug',
                    'terms' => $type,
                ],
            ],
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);

        return array_map(fn($post) => new AnomalyPost($post), $posts);
    }

    /**
     * Get all anomalies.
     *
     * @return AnomalyPost[]
     */
    public function all(): array
    {
        $posts = get_posts([
            'post_type' => PostTypeRegistry::POST_TYPE_ANOMALY,
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);

        return array_map(fn($post) => new AnomalyPost($post), $posts);
    }

    /**
     * Create an anomaly.
     *
     * @return int|false Post ID on success, false on failure
     */
    public function create(string $name, ?string $type = null): int|false
    {
        $postData = [
            'post_type' => PostTypeRegistry::POST_TYPE_ANOMALY,
            'post_title' => $name,
            'post_status' => 'publish',
        ];

        $postId = wp_insert_post($postData, true);

        if (is_wp_error($postId) || $postId === 0) {
            return false;
        }

        if ($type !== null) {
            wp_set_object_terms($postId, $type, PostTypeRegistry::TAXONOMY_ANOMALY_TYPE);
        }

        return $postId;
    }

    /**
     * Delete an anomaly.
     */
    public function delete(int $postId): bool
    {
        $result = wp_delete_post($postId, true);
        return $result !== false && $result !== null;
    }

    /**
     * Count all anomalies.
     */
    public function count(): int
    {
        $counts = wp_count_posts(PostTypeRegistry::POST_TYPE_ANOMALY);
        return (int) ($counts->publish ?? 0);
    }
}
