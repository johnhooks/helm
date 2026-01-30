<?php

declare(strict_types=1);

namespace Helm\Ships;

use Helm\PostTypes\PostTypeRegistry;
use WP_Post;
use WP_Query;

/**
 * Repository for Ship storage using CPT.
 */
final class ShipRepository
{
    /**
     * Get a ship by ID.
     */
    public function get(string $id): ?Ship
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'meta_query' => [
                [
                    'key' => PostTypeRegistry::META_SHIP_ID,
                    'value' => $id,
                ],
            ],
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => false,
        ]);

        if (! $query->have_posts()) {
            return null;
        }

        return ShipPost::fromPost($query->posts[0])->toShip();
    }

    /**
     * Get a ship by post ID.
     */
    public function getByPostId(int $postId): ?Ship
    {
        $shipPost = ShipPost::fromId($postId);
        return $shipPost?->toShip();
    }

    /**
     * Get all ships.
     *
     * @return array<Ship>
     */
    public function all(): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => false,
        ]);

        return array_map(
            fn(WP_Post $post) => ShipPost::fromPost($post)->toShip(),
            $query->posts
        );
    }

    /**
     * Save a ship (insert or update).
     */
    public function save(Ship $ship): void
    {
        $existing = $this->getPostIdByShipId($ship->id);

        if ($existing !== null) {
            $this->update($existing, $ship);
        } else {
            $this->create($ship);
        }
    }

    /**
     * Create a new ship post.
     */
    private function create(Ship $ship): int
    {
        $postId = wp_insert_post([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'post_title' => $ship->name,
            'post_author' => $ship->ownerId,
            'post_date' => gmdate('Y-m-d H:i:s', $ship->createdAt !== 0 ? $ship->createdAt : time()),
            'post_date_gmt' => gmdate('Y-m-d H:i:s', $ship->createdAt !== 0 ? $ship->createdAt : time()),
        ], true);

        if (is_wp_error($postId)) {
            throw new \RuntimeException(
                sprintf('Failed to create ship post: %s', $postId->get_error_message())
            );
        }

        $this->saveMeta($postId, $ship);

        return $postId;
    }

    /**
     * Update an existing ship post.
     */
    private function update(int $postId, Ship $ship): void
    {
        wp_update_post([
            'ID' => $postId,
            'post_title' => $ship->name,
            'post_author' => $ship->ownerId,
            'post_modified' => gmdate('Y-m-d H:i:s', $ship->updatedAt !== 0 ? $ship->updatedAt : time()),
            'post_modified_gmt' => gmdate('Y-m-d H:i:s', $ship->updatedAt !== 0 ? $ship->updatedAt : time()),
        ]);

        $this->saveMeta($postId, $ship);
    }

    /**
     * Save ship metadata.
     */
    private function saveMeta(int $postId, Ship $ship): void
    {
        update_post_meta($postId, PostTypeRegistry::META_SHIP_ID, $ship->id);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_LOCATION, $ship->location);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_NODE_ID, $ship->nodeId);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_CREDITS, $ship->credits);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_FUEL, $ship->fuel);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_DRIVE_RANGE, $ship->driveRange);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_NAV_SKILL, $ship->navSkill);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_NAV_EFFICIENCY, $ship->navEfficiency);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_CARGO, $ship->cargo);
        update_post_meta($postId, PostTypeRegistry::META_SHIP_ARTIFACTS, $ship->artifacts);
    }

    /**
     * Delete a ship.
     */
    public function delete(string $id): void
    {
        $postId = $this->getPostIdByShipId($id);

        if ($postId !== null) {
            wp_delete_post($postId, true);
        }
    }

    /**
     * Get ships at a location.
     *
     * @return array<Ship>
     */
    public function atLocation(string $starId): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => [
                [
                    'key' => PostTypeRegistry::META_SHIP_LOCATION,
                    'value' => $starId,
                ],
            ],
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => false,
        ]);

        return array_map(
            fn(WP_Post $post) => ShipPost::fromPost($post)->toShip(),
            $query->posts
        );
    }

    /**
     * Get all ships owned by a user.
     *
     * @return array<Ship>
     */
    public function allByOwner(int $userId): array
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'author' => $userId,
            'orderby' => 'date',
            'order' => 'DESC',
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => false,
        ]);

        return array_map(
            fn(WP_Post $post) => ShipPost::fromPost($post)->toShip(),
            $query->posts
        );
    }

    /**
     * Get the first ship owned by a user.
     *
     * For the one-ship-per-user model, this returns the user's ship.
     */
    public function getByOwner(int $userId): ?Ship
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'author' => $userId,
            'orderby' => 'date',
            'order' => 'ASC', // Get oldest (first) ship
            'no_found_rows' => true,
            'update_post_meta_cache' => true,
            'update_post_term_cache' => false,
        ]);

        if (! $query->have_posts()) {
            return null;
        }

        return ShipPost::fromPost($query->posts[0])->toShip();
    }

    /**
     * Check if a user owns any ships.
     */
    public function ownerHasShip(int $userId): bool
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'author' => $userId,
            'fields' => 'ids',
            'no_found_rows' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        return $query->posts !== [];
    }

    /**
     * Get the post ID for a ship ID.
     */
    private function getPostIdByShipId(string $id): ?int
    {
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'post_status' => 'publish',
            'posts_per_page' => 1,
            'fields' => 'ids',
            'meta_query' => [
                [
                    'key' => PostTypeRegistry::META_SHIP_ID,
                    'value' => $id,
                ],
            ],
            'no_found_rows' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        if ($query->posts === []) {
            return null;
        }

        return (int) $query->posts[0];
    }

    /**
     * Get the total count of ships.
     */
    public function count(): int
    {
        $counts = wp_count_posts(PostTypeRegistry::POST_TYPE_SHIP);
        return (int) ($counts->publish ?? 0);
    }

    /**
     * Check if a ship exists.
     */
    public function exists(string $id): bool
    {
        return $this->getPostIdByShipId($id) !== null;
    }

    // Legacy methods for backward compatibility during migration

    /**
     * Check if the legacy table exists.
     *
     * @deprecated Will be removed after migration
     */
    public function tableExists(): bool
    {
        global $wpdb;
        $table = $wpdb->prefix . 'helm_ships';
        return $wpdb->get_var(
            $wpdb->prepare("SHOW TABLES LIKE %s", $table)
        ) === $table;
    }

    /**
     * Create the legacy table.
     *
     * @deprecated Will be removed after migration
     */
    public function createTable(): void
    {
        // No-op: CPT uses WordPress tables
    }
}
