<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use Helm\Database\Schema;
use Helm\Lib\Date;
use Helm\Lib\HydratesModels;
use Helm\ShipLink\Models\ShipState;

/**
 * Repository for ship state table operations.
 *
 * Handles CRUD operations for the helm_ship_state custom table.
 */
final class ShipStateRepository
{
    use HydratesModels;

    /**
     * Find ship state by post ID.
     */
    public function find(int $shipPostId): ?ShipState
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

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

        return $this->hydrate($row);
    }

    /**
     * Find or create ship state for a post ID.
     *
     * If no state record exists, creates one with defaults.
     */
    public function findOrCreate(int $shipPostId): ShipState
    {
        $state = $this->find($shipPostId);

        if ($state !== null) {
            return $state;
        }

        $state = ShipState::defaults($shipPostId);
        $this->insert($state);

        return $state;
    }

    /**
     * Check if state exists for a ship.
     */
    public function exists(int $shipPostId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE ship_post_id = %d",
                $shipPostId
            )
        );

        return (int) $count > 0;
    }

    /**
     * Insert a new ship state record.
     */
    public function insert(ShipState $state): bool
    {
        global $wpdb;

        $now = Date::now();
        $state->created_at = $now;
        $state->updated_at = $now;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;
        $row = $this->serializeToDbRow($state->toArray(), $state);

        $result = $wpdb->insert($table, $row);

        if ($result !== false) {
            $state->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Update an existing ship state record.
     *
     * Uses dirty tracking for efficient partial updates.
     */
    public function update(ShipState $state): bool
    {
        global $wpdb;

        $dirty = $state->getDirty();

        if ($dirty === []) {
            return true;
        }

        $state->updated_at = Date::now();
        $dirty = $state->getDirty();

        $row = $this->serializeToDbRow($dirty, $state);
        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

        $result = $wpdb->update(
            $table,
            $row,
            ['ship_post_id' => $state->ship_post_id]
        );

        if ($result !== false) {
            $state->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Save ship state (insert or update).
     */
    public function save(ShipState $state): bool
    {
        if (!$this->exists($state->ship_post_id)) {
            return $this->insert($state);
        }

        return $this->update($state);
    }

    /**
     * Delete ship state by post ID.
     */
    public function delete(int $shipPostId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

        $result = $wpdb->delete($table, ['ship_post_id' => $shipPostId]);

        return $result !== false;
    }

    /**
     * Get all ships at a specific node.
     *
     * @return array<ShipState>
     */
    public function atNode(int $nodeId): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE node_id = %d",
                $nodeId
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Get ships with a current action.
     *
     * @return array<ShipState>
     */
    public function withCurrentAction(): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

        $rows = $wpdb->get_results(
            "SELECT * FROM {$table} WHERE current_action_id IS NOT NULL",
            ARRAY_A
        );

        return array_map(
            fn(array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Update just the node_id for a ship.
     */
    public function updateNodeId(int $shipPostId, ?int $nodeId): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

        $result = $wpdb->update(
            $table,
            ['node_id' => $nodeId],
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

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

        $result = $wpdb->update(
            $table,
            ['current_action_id' => $actionId],
            ['ship_post_id' => $shipPostId]
        );

        return $result !== false;
    }

    /**
     * Lock a ship's state row for update within a transaction.
     *
     * Returns the current_action_id (null if slot is free).
     * Uses NOWAIT to fail immediately if locked by another transaction.
     * Must be called within an active transaction.
     *
     * @throws \RuntimeException If row is locked by another transaction
     */
    public function lockForUpdate(int $shipPostId): ?int
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_STATE;

        // Suppress errors - we'll check for lock failure via the result
        $wpdb->suppress_errors(true);

        $currentActionId = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT current_action_id FROM {$table} WHERE ship_post_id = %d FOR UPDATE NOWAIT",
                $shipPostId
            )
        );

        $error = $wpdb->last_error;
        $wpdb->suppress_errors(false);

        if ($error !== '' && str_contains($error, 'lock')) {
            throw new \RuntimeException('Ship is locked by another operation');
        }

        return $currentActionId !== null ? (int) $currentActionId : null;
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): ShipState
    {
        /** @var ShipState */
        return $this->hydrateModel(ShipState::class, $row);
    }
}
