<?php

declare(strict_types=1);

namespace Helm\Stars;

use Helm\PostTypes\PostTypeRegistry;
use WP_Post;

/**
 * Adapter between WP_Post and Star value object.
 *
 * Wraps a WordPress post of type helm_star and provides
 * conversion to/from the Star value object.
 */
final class StarPost
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
     * Get the star's catalog ID (e.g., 'HIP_70890', 'SOL').
     */
    public function catalogId(): string
    {
        return (string) get_post_meta(
            $this->post->ID,
            PostTypeRegistry::META_STAR_CATALOG_ID,
            true
        );
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
     * Convert to Star value object.
     */
    public function toStar(): Star
    {
        $postId = $this->post->ID;

        $properties = get_post_meta($postId, PostTypeRegistry::META_STAR_PROPERTIES, true);
        $confirmedPlanets = get_post_meta($postId, PostTypeRegistry::META_STAR_CONFIRMED_PLANETS, true);

        // Get constellation from taxonomy
        $constellations = wp_get_post_terms($postId, PostTypeRegistry::TAXONOMY_CONSTELLATION);
        if (is_array($constellations) && $constellations !== []) {
            $properties['constellation'] = $constellations[0]->name;
        }

        return new Star(
            id: $this->catalogId(),
            name: $this->post->post_title !== $this->catalogId() ? $this->post->post_title : null,
            spectralType: (string) get_post_meta($postId, PostTypeRegistry::META_STAR_SPECTRAL_TYPE, true),
            distanceLy: (float) get_post_meta($postId, PostTypeRegistry::META_STAR_DISTANCE_LY, true),
            ra: (float) get_post_meta($postId, PostTypeRegistry::META_STAR_RA, true),
            dec: (float) get_post_meta($postId, PostTypeRegistry::META_STAR_DEC, true),
            properties: is_array($properties) ? $properties : [],
            confirmedPlanets: is_array($confirmedPlanets) ? $confirmedPlanets : [],
        );
    }

    /**
     * Create a StarPost from a WP_Post.
     */
    public static function fromPost(WP_Post $post): self
    {
        if ($post->post_type !== PostTypeRegistry::POST_TYPE_STAR) {
            throw new \InvalidArgumentException(
                sprintf('Expected post type %s, got %s', PostTypeRegistry::POST_TYPE_STAR, $post->post_type)
            );
        }

        return new self($post);
    }

    /**
     * Create a StarPost from a post ID.
     */
    public static function fromId(int $postId): ?self
    {
        $post = get_post($postId);

        if (! $post instanceof WP_Post) {
            return null;
        }

        if ($post->post_type !== PostTypeRegistry::POST_TYPE_STAR) {
            return null;
        }

        return new self($post);
    }
}
