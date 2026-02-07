<?php

declare(strict_types=1);

namespace Helm\Stations;

use Helm\PostTypes\PostTypeRegistry;
use WP_Post;

/**
 * Adapter between WP_Post and Station value object.
 */
final class StationPost
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
     * Get the owner user ID.
     */
    public function ownerId(): ?int
    {
        $authorId = (int) $this->post->post_author;
        return $authorId > 0 ? $authorId : null;
    }

    /**
     * Get the underlying WP_Post.
     */
    public function post(): WP_Post
    {
        return $this->post;
    }

    /**
     * Get the station type from taxonomy.
     */
    public function stationType(): ?string
    {
        $terms = wp_get_post_terms($this->post->ID, PostTypeRegistry::TAXONOMY_STATION_TYPE);
        if (is_array($terms) && $terms !== []) {
            return $terms[0]->slug;
        }
        return null;
    }

    /**
     * Convert to Station value object.
     */
    public function toStation(): Station
    {
        return new Station(
            id: $this->post->ID,
            name: $this->post->post_title,
            type: $this->stationType(),
            ownerId: $this->ownerId(),
        );
    }

    /**
     * Create a StationPost from a WP_Post.
     */
    public static function fromPost(WP_Post $post): self
    {
        if ($post->post_type !== PostTypeRegistry::POST_TYPE_STATION) {
            throw new \InvalidArgumentException(
                sprintf('Expected post type %s, got %s', PostTypeRegistry::POST_TYPE_STATION, $post->post_type)
            );
        }

        return new self($post);
    }

    /**
     * Create a StationPost from a post ID.
     */
    public static function fromId(int $postId): ?self
    {
        $post = get_post($postId);

        if (! $post instanceof WP_Post) {
            return null;
        }

        if ($post->post_type !== PostTypeRegistry::POST_TYPE_STATION) {
            return null;
        }

        return new self($post);
    }
}
