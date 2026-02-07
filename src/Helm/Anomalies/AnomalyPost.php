<?php

declare(strict_types=1);

namespace Helm\Anomalies;

use Helm\PostTypes\PostTypeRegistry;
use WP_Post;

/**
 * Adapter between WP_Post and Anomaly value object.
 */
final class AnomalyPost
{
    public function __construct(
        private readonly WP_Post $post,
    ) {
    }

    /**
     * Get the WordPress post ID.
     */
    public function postId(): int
    {
        return $this->post->ID;
    }

    /**
     * Get the display name.
     */
    public function displayName(): string
    {
        return $this->post->post_title;
    }

    /**
     * Get the underlying WP_Post.
     */
    public function post(): WP_Post
    {
        return $this->post;
    }

    /**
     * Get the anomaly type from taxonomy.
     */
    public function anomalyType(): ?string
    {
        $terms = wp_get_post_terms($this->post->ID, PostTypeRegistry::TAXONOMY_ANOMALY_TYPE);
        if (is_array($terms) && $terms !== []) {
            return $terms[0]->slug;
        }
        return null;
    }

    /**
     * Convert to Anomaly value object.
     */
    public function toAnomaly(): Anomaly
    {
        return new Anomaly(
            id: $this->post->ID,
            name: $this->post->post_title,
            type: $this->anomalyType(),
        );
    }

    /**
     * Create an AnomalyPost from a WP_Post.
     */
    public static function fromPost(WP_Post $post): self
    {
        if ($post->post_type !== PostTypeRegistry::POST_TYPE_ANOMALY) {
            throw new \InvalidArgumentException(
                sprintf('Expected post type %s, got %s', PostTypeRegistry::POST_TYPE_ANOMALY, $post->post_type)
            );
        }

        return new self($post);
    }

    /**
     * Create an AnomalyPost from a post ID.
     */
    public static function fromId(int $postId): ?self
    {
        $post = get_post($postId);

        if (! $post instanceof WP_Post) {
            return null;
        }

        if ($post->post_type !== PostTypeRegistry::POST_TYPE_ANOMALY) {
            return null;
        }

        return new self($post);
    }
}
