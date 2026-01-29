<?php

declare(strict_types=1);

namespace Helm\Planets;

use Helm\PostTypes\PostTypeRegistry;
use WP_Post;

/**
 * Adapter between WP_Post and Planet value object.
 *
 * Wraps a WordPress post of type helm_planet and provides
 * conversion to/from the Planet value object.
 */
final class PlanetPost
{
    public function __construct(
        private readonly WP_Post $post,
    ) {}

    /**
     * Get the WordPress post ID.
     */
    public function postId(): int
    {
        return $this->post->ID;
    }

    /**
     * Get the planet's unique ID.
     */
    public function planetId(): string
    {
        return (string) get_post_meta(
            $this->post->ID,
            PostTypeRegistry::META_PLANET_ID,
            true
        );
    }

    /**
     * Get the parent star's catalog ID.
     */
    public function starId(): string
    {
        return (string) get_post_meta(
            $this->post->ID,
            PostTypeRegistry::META_PLANET_STAR_ID,
            true
        );
    }

    /**
     * Get the parent star's post ID.
     */
    public function starPostId(): int
    {
        return (int) $this->post->post_parent;
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
     * Convert to Planet value object.
     */
    public function toPlanet(): Planet
    {
        $postId = $this->post->ID;

        $resources = get_post_meta($postId, PostTypeRegistry::META_PLANET_RESOURCES, true);

        // Get planet type from taxonomy
        $type = Planet::TYPE_TERRESTRIAL;
        $types = wp_get_post_terms($postId, PostTypeRegistry::TAXONOMY_PLANET_TYPE);
        if (! empty($types) && ! is_wp_error($types)) {
            $type = $types[0]->slug;
        }

        return new Planet(
            id: $this->planetId(),
            starId: $this->starId(),
            type: $type,
            orbitIndex: (int) get_post_meta($postId, PostTypeRegistry::META_PLANET_ORBIT_INDEX, true),
            orbitAu: (float) get_post_meta($postId, PostTypeRegistry::META_PLANET_ORBIT_AU, true),
            resources: is_array($resources) ? $resources : [],
            habitable: (bool) get_post_meta($postId, PostTypeRegistry::META_PLANET_HABITABLE, true),
            moons: (int) get_post_meta($postId, PostTypeRegistry::META_PLANET_MOONS, true),
            name: $this->post->post_title !== $this->planetId() ? $this->post->post_title : null,
            radiusEarth: ($r = get_post_meta($postId, PostTypeRegistry::META_PLANET_RADIUS, true)) ? (float) $r : null,
            massEarth: ($m = get_post_meta($postId, PostTypeRegistry::META_PLANET_MASS, true)) ? (float) $m : null,
            confirmed: (bool) get_post_meta($postId, PostTypeRegistry::META_PLANET_CONFIRMED, true),
        );
    }

    /**
     * Create a PlanetPost from a WP_Post.
     */
    public static function fromPost(WP_Post $post): self
    {
        if ($post->post_type !== PostTypeRegistry::POST_TYPE_PLANET) {
            throw new \InvalidArgumentException(
                sprintf('Expected post type %s, got %s', PostTypeRegistry::POST_TYPE_PLANET, $post->post_type)
            );
        }

        return new self($post);
    }

    /**
     * Create a PlanetPost from a post ID.
     */
    public static function fromId(int $postId): ?self
    {
        $post = get_post($postId);

        if (! $post instanceof WP_Post) {
            return null;
        }

        if ($post->post_type !== PostTypeRegistry::POST_TYPE_PLANET) {
            return null;
        }

        return new self($post);
    }
}
