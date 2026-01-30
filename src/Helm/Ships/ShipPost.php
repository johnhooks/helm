<?php

declare(strict_types=1);

namespace Helm\Ships;

use Helm\PostTypes\PostTypeRegistry;
use WP_Post;

/**
 * Adapter between WP_Post and Ship value object.
 *
 * Wraps a WordPress post of type helm_ship and provides
 * conversion to/from the Ship value object.
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
     * Convert to Ship value object.
     */
    public function toShip(): Ship
    {
        $postId = $this->post->ID;

        $cargo = get_post_meta($postId, PostTypeRegistry::META_SHIP_CARGO, true);
        $artifacts = get_post_meta($postId, PostTypeRegistry::META_SHIP_ARTIFACTS, true);
        $nodeId = get_post_meta($postId, PostTypeRegistry::META_SHIP_NODE_ID, true);
        $fuel = get_post_meta($postId, PostTypeRegistry::META_SHIP_FUEL, true);
        $driveRange = get_post_meta($postId, PostTypeRegistry::META_SHIP_DRIVE_RANGE, true);
        $navSkill = get_post_meta($postId, PostTypeRegistry::META_SHIP_NAV_SKILL, true);
        $navEfficiency = get_post_meta($postId, PostTypeRegistry::META_SHIP_NAV_EFFICIENCY, true);

        return new Ship(
            id: $this->shipId(),
            name: $this->post->post_title,
            ownerId: $this->ownerId(),
            location: (string) get_post_meta($postId, PostTypeRegistry::META_SHIP_LOCATION, true),
            nodeId: $nodeId !== '' ? (int) $nodeId : 0,
            credits: (int) get_post_meta($postId, PostTypeRegistry::META_SHIP_CREDITS, true),
            fuel: $fuel !== '' ? (float) $fuel : Ship::DEFAULT_FUEL,
            driveRange: $driveRange !== '' ? (float) $driveRange : Ship::DEFAULT_DRIVE_RANGE,
            navSkill: $navSkill !== '' ? (float) $navSkill : Ship::DEFAULT_NAV_SKILL,
            navEfficiency: $navEfficiency !== '' ? (float) $navEfficiency : Ship::DEFAULT_NAV_EFFICIENCY,
            cargo: is_array($cargo) ? $cargo : [],
            artifacts: is_array($artifacts) ? $artifacts : [],
            createdAt: strtotime($this->post->post_date_gmt),
            updatedAt: strtotime($this->post->post_modified_gmt),
        );
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
