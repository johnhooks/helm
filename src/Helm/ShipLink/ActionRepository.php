<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use DateTimeImmutable;
use Helm\Database\Schema;

/**
 * Repository for ship action records.
 *
 * Handles CRUD operations for the helm_ship_actions table.
 */
final class ActionRepository
{
    /**
     * Find an action by ID.
     */
    public function find(int $id): ?ActionRecord
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE id = %d",
                $id
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return ActionRecord::fromRow($row);
    }

    /**
     * Find all actions for a ship.
     *
     * @return array<ActionRecord>
     */
    public function findForShip(int $shipPostId, ?int $limit = null): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $sql = $wpdb->prepare(
            "SELECT * FROM {$table} WHERE ship_post_id = %d ORDER BY created_at DESC",
            $shipPostId
        );

        if ($limit !== null) {
            $sql .= $wpdb->prepare(' LIMIT %d', $limit);
        }

        $rows = $wpdb->get_results($sql, ARRAY_A);

        return array_map(
            fn(array $row) => ActionRecord::fromRow($row),
            $rows
        );
    }

    /**
     * Find the current (non-complete) action for a ship.
     */
    public function findCurrentForShip(int $shipPostId): ?ActionRecord
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE ship_post_id = %d
                   AND status IN ('pending', 'running')
                 ORDER BY created_at DESC
                 LIMIT 1",
                $shipPostId
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return ActionRecord::fromRow($row);
    }

    /**
     * Find all pending actions.
     *
     * @return array<ActionRecord>
     */
    public function findPending(): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $rows = $wpdb->get_results(
            "SELECT * FROM {$table}
             WHERE status = 'pending'
               AND (deferred_until IS NULL OR deferred_until <= NOW())
             ORDER BY created_at ASC",
            ARRAY_A
        );

        return array_map(
            fn(array $row) => ActionRecord::fromRow($row),
            $rows
        );
    }

    /**
     * Find all running actions.
     *
     * @return array<ActionRecord>
     */
    public function findRunning(): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $rows = $wpdb->get_results(
            "SELECT * FROM {$table} WHERE status = 'running' ORDER BY created_at ASC",
            ARRAY_A
        );

        return array_map(
            fn(array $row) => ActionRecord::fromRow($row),
            $rows
        );
    }

    /**
     * Find actions that are deferred until a specific time or earlier.
     *
     * @return array<ActionRecord>
     */
    public function findDeferredUntil(DateTimeImmutable $until): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE status = 'pending'
                   AND deferred_until IS NOT NULL
                   AND deferred_until <= %s
                 ORDER BY deferred_until ASC",
                $until->format('Y-m-d H:i:s')
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => ActionRecord::fromRow($row),
            $rows
        );
    }

    /**
     * Find actions by status.
     *
     * @return array<ActionRecord>
     */
    public function findByStatus(ActionStatus $status, ?int $limit = null): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $sql = $wpdb->prepare(
            "SELECT * FROM {$table} WHERE status = %s ORDER BY created_at DESC",
            $status->value
        );

        if ($limit !== null) {
            $sql .= $wpdb->prepare(' LIMIT %d', $limit);
        }

        $rows = $wpdb->get_results($sql, ARRAY_A);

        return array_map(
            fn(array $row) => ActionRecord::fromRow($row),
            $rows
        );
    }

    /**
     * Insert a new action record.
     *
     * @return int|false The inserted ID, or false on failure
     */
    public function insert(ActionRecord $record): int|false
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;
        $row = $record->toRow();

        // Remove id if present (auto-increment)
        unset($row['id']);

        $result = $wpdb->insert($table, $row);

        if ($result === false) {
            return false;
        }

        return (int) $wpdb->insert_id;
    }

    /**
     * Update an existing action record.
     */
    public function update(ActionRecord $record): bool
    {
        if ($record->id === null) {
            return false;
        }

        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;
        $row = $record->toRow();

        // Remove id from data (it's the key)
        $id = $row['id'];
        unset($row['id']);

        // Add updated_at
        $row['updated_at'] = current_time('mysql');

        $result = $wpdb->update($table, $row, ['id' => $id]);

        return $result !== false;
    }

    /**
     * Update just the status (and optionally result) of an action.
     *
     * @param array<string, mixed>|null $result
     */
    public function updateStatus(int $id, ActionStatus $status, ?array $result = null): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $data = [
            'status' => $status->value,
            'updated_at' => current_time('mysql'),
        ];

        if ($result !== null) {
            $data['result'] = json_encode($result, JSON_THROW_ON_ERROR);
        }

        $wpdbResult = $wpdb->update($table, $data, ['id' => $id]);

        return $wpdbResult !== false;
    }

    /**
     * Mark an action as running.
     */
    public function markRunning(int $id): bool
    {
        return $this->updateStatus($id, ActionStatus::Running);
    }

    /**
     * Mark an action as fulfilled.
     *
     * @param array<string, mixed>|null $result
     */
    public function markFulfilled(int $id, ?array $result = null): bool
    {
        return $this->updateStatus($id, ActionStatus::Fulfilled, $result);
    }

    /**
     * Mark an action as failed.
     *
     * @param array<string, mixed>|null $result
     */
    public function markFailed(int $id, ?array $result = null): bool
    {
        return $this->updateStatus($id, ActionStatus::Failed, $result);
    }

    /**
     * Delete an action by ID.
     */
    public function delete(int $id): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $result = $wpdb->delete($table, ['id' => $id]);

        return $result !== false;
    }

    /**
     * Delete all actions for a ship.
     */
    public function deleteForShip(int $shipPostId): int
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $result = $wpdb->delete($table, ['ship_post_id' => $shipPostId]);

        return $result !== false ? $result : 0;
    }

    /**
     * Delete completed actions older than a certain age.
     *
     * @return int Number of deleted records
     */
    public function deleteOldCompleted(DateTimeImmutable $olderThan): int
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $result = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$table}
                 WHERE status IN ('fulfilled', 'partial', 'failed')
                   AND updated_at < %s",
                $olderThan->format('Y-m-d H:i:s')
            )
        );

        return $result !== false ? (int) $result : 0;
    }

    /**
     * Count actions by status.
     *
     * @return array<string, int>
     */
    public function countByStatus(): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $rows = $wpdb->get_results(
            "SELECT status, COUNT(*) as count FROM {$table} GROUP BY status",
            ARRAY_A
        );

        $counts = [];
        foreach ($rows as $row) {
            $counts[$row['status']] = (int) $row['count'];
        }

        return $counts;
    }

    /**
     * Count total actions.
     */
    public function count(): int
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
    }
}
