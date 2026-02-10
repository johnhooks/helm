<?php

declare(strict_types=1);

namespace Helm\Ships;

use Helm\PostTypes\PostTypeRegistry;
use WP_Post;

/**
 * Ship CPT wrapper.
 *
 * Wraps a WordPress post of type helm_ship and provides
 * access to ship metadata.
 */
final class ShipPost
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
     * Get the ship's unique ID.
     */
    public function shipId(): string
    {
        return (string) get_post_meta(
            $this->post->ID,
            PostTypeRegistry::META_SHIP_ID,
            true
        );
    }

    /**
     * Get the ship name.
     */
    public function name(): string
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
     * Get the owner's WordPress user ID.
     */
    public function ownerId(): int
    {
        return (int) $this->post->post_author;
    }

    /**
     * Get the total count of ships.
     */
    public static function count(): int
    {
        $counts = wp_count_posts(PostTypeRegistry::POST_TYPE_SHIP);
        return (int) ($counts->publish ?? 0);
    }

    /**
     * Create a ShipPost from a WP_Post.
     */
    public static function fromPost(WP_Post $post): self
    {
        if ($post->post_type !== PostTypeRegistry::POST_TYPE_SHIP) {
            throw new \InvalidArgumentException(
                sprintf('Expected post type %s, got %s', PostTypeRegistry::POST_TYPE_SHIP, $post->post_type)
            );
        }

        return new self($post);
    }

    /**
     * Find the ship belonging to a user.
     */
    public static function findForUser(int $userId): ?self
    {
        $posts = get_posts([
            'post_type'   => PostTypeRegistry::POST_TYPE_SHIP,
            'post_author' => $userId,
            'numberposts' => 1,
            'post_status' => 'publish',
        ]);

        if ($posts === []) {
            return null;
        }

        return new self($posts[0]);
    }

    /**
     * Create a ShipPost from a post ID.
     */
    public static function fromId(int $postId): ?self
    {
        $post = get_post($postId);

        if (! $post instanceof WP_Post) {
            return null;
        }

        if ($post->post_type !== PostTypeRegistry::POST_TYPE_SHIP) {
            return null;
        }

        return new self($post);
    }
}
