<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Database\Schema;

/**
 * Repository for ship systems table operations.
 *
 * Handles CRUD operations for the helm_ship_systems custom table.
 */
final class ShipSystemsRepository
{
    /**
     * Find ship systems by post ID.
     */
    public function find(int $shipPostId): ?ShipSystems
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE ship_post_id = %d",
                $shipPostId
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return ShipSystems::fromRow($row);
    }

    /**
     * Find or create ship systems for a post ID.
     *
     * If no systems record exists, creates one with defaults.
     */
    public function findOrCreate(int $shipPostId): ShipSystems
    {
        $systems = $this->find($shipPostId);

        if ($systems !== null) {
            return $systems;
        }

        $systems = ShipSystems::defaults($shipPostId);
        $this->insert($systems);

        return $systems;
    }

    /**
     * Check if systems exist for a ship.
     */
    public function exists(int $shipPostId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE ship_post_id = %d",
                $shipPostId
            )
        );

        return (int) $count > 0;
    }

    /**
     * Insert a new ship systems record.
     */
    public function insert(ShipSystems $systems): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;
        $row = $systems->toRow();

        $result = $wpdb->insert($table, $row);

        return $result !== false;
    }

    /**
     * Update an existing ship systems record.
     */
    public function update(ShipSystems $systems): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;
        $row = $systems->toRow();

        // Remove ship_post_id from data (it's the key)
        $shipPostId = $row['ship_post_id'];
        unset($row['ship_post_id']);

        // Add updated_at
        $row['updated_at'] = current_time('mysql');

        $result = $wpdb->update(
            $table,
            $row,
            ['ship_post_id' => $shipPostId]
        );

        return $result !== false;
    }

    /**
     * Save ship systems (insert or update).
     */
    public function save(ShipSystems $systems): bool
    {
        if ($this->exists($systems->shipPostId)) {
            return $this->update($systems);
        }

        return $this->insert($systems);
    }

    /**
     * Delete ship systems by post ID.
     */
    public function delete(int $shipPostId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $result = $wpdb->delete($table, ['ship_post_id' => $shipPostId]);

        return $result !== false;
    }

    /**
     * Get all ships at a specific node.
     *
     * @return array<ShipSystems>
     */
    public function atNode(int $nodeId): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE node_id = %d",
                $nodeId
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => ShipSystems::fromRow($row),
            $rows
        );
    }

    /**
     * Get ships with a current action.
     *
     * @return array<ShipSystems>
     */
    public function withCurrentAction(): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $rows = $wpdb->get_results(
            "SELECT * FROM {$table} WHERE current_action_id IS NOT NULL",
            ARRAY_A
        );

        return array_map(
            fn(array $row) => ShipSystems::fromRow($row),
            $rows
        );
    }

    /**
     * Get ships with low core life.
     *
     * @param float $threshold Core life threshold
     * @return array<ShipSystems>
     */
    public function withLowCoreLife(float $threshold = 100.0): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE core_life < %f ORDER BY core_life ASC",
                $threshold
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => ShipSystems::fromRow($row),
            $rows
        );
    }

    /**
     * Count total ships with systems records.
     */
    public function count(): int
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
    }

    /**
     * Update just the node_id for a ship.
     */
    public function updateNodeId(int $shipPostId, ?int $nodeId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $result = $wpdb->update(
            $table,
            [
                'node_id' => $nodeId,
                'updated_at' => current_time('mysql'),
            ],
            ['ship_post_id' => $shipPostId]
        );

        return $result !== false;
    }

    /**
     * Update just the current_action_id for a ship.
     */
    public function updateCurrentAction(int $shipPostId, ?int $actionId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_SYSTEMS;

        $result = $wpdb->update(
            $table,
            [
                'current_action_id' => $actionId,
                'updated_at' => current_time('mysql'),
            ],
            ['ship_post_id' => $shipPostId]
        );

        return $result !== false;
    }
}
