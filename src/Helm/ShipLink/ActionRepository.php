<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use BackedEnum;
use DateTimeImmutable;
use Helm\Database\Schema;
use Helm\Database\Transaction;
use Helm\Lib\Date;
use Helm\ShipLink\Models\Action;
use Helm\StellarWP\Models\Model;

/**
 * Repository for ship actions table operations.
 *
 * Handles CRUD operations for the helm_ship_actions custom table.
 */
final class ActionRepository
{
    /**
     * Find an action by ID.
     */
    public function find(int $id): ?Action
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

        return $this->hydrate($row);
    }

    /**
     * Find all actions for a ship.
     *
     * @return array<Action>
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
            fn(array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find the current (non-complete) action for a ship.
     */
    public function findCurrentForShip(int $shipPostId): ?Action
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE ship_post_id = %d
                   AND status IN (%s, %s)
                 ORDER BY created_at DESC
                 LIMIT 1",
                $shipPostId,
                ActionStatus::Pending->value,
                ActionStatus::Running->value
            ),
            ARRAY_A
        );

        if ($row === null) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * Find all pending actions ready to process.
     *
     * @return array<Action>
     */
    public function findPending(): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE status = %s
                   AND (deferred_until IS NULL OR deferred_until <= NOW())
                 ORDER BY created_at ASC",
                ActionStatus::Pending->value
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find all running actions.
     *
     * @return array<Action>
     */
    public function findRunning(): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} WHERE status = %s ORDER BY created_at ASC",
                ActionStatus::Running->value
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find actions that are deferred until a specific time or earlier.
     *
     * @return array<Action>
     */
    public function findDeferredUntil(DateTimeImmutable $until): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE status = %s
                   AND deferred_until IS NOT NULL
                   AND deferred_until <= %s
                 ORDER BY deferred_until ASC",
                ActionStatus::Pending->value,
                $until->format('Y-m-d H:i:s')
            ),
            ARRAY_A
        );

        return array_map(
            fn(array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Find actions by status.
     *
     * @return array<Action>
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
            fn(array $row) => $this->hydrate($row),
            $rows
        );
    }

    /**
     * Insert a new action.
     */
    public function insert(Action $action): bool
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;
        $row = $this->serialize($action->toArray(), $action);

        $result = $wpdb->insert($table, $row);

        if ($result !== false) {
            $action->id = (int) $wpdb->insert_id;
            $action->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Update an existing action.
     */
    public function update(Action $action): bool
    {
        global $wpdb;

        $dirty = $action->getDirty();

        if ($dirty === []) {
            return true;
        }

        $row = $this->serialize($dirty, $action);
        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;

        $result = $wpdb->update(
            $table,
            $row,
            ['id' => $action->id]
        );

        if ($result !== false) {
            $action->syncOriginal();
        }

        return $result !== false;
    }

    /**
     * Save an action (insert or update).
     */
    public function save(Action $action): bool
    {
        if ($action->id === null) {
            return $this->insert($action);
        }

        return $this->update($action);
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
                 WHERE status IN (%s, %s, %s)
                   AND updated_at < %s",
                ActionStatus::Fulfilled->value,
                ActionStatus::Partial->value,
                ActionStatus::Failed->value,
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

    /**
     * Claim a batch of ready actions for processing.
     *
     * Uses SKIP LOCKED for non-blocking concurrent access.
     * Actions are atomically marked as Running before being returned.
     *
     * @return array<Action> Claimed actions (already marked as Running)
     */
    public function claimReady(int $limit = 50): array
    {
        global $wpdb;

        $table = $wpdb->prefix . Schema::TABLE_SHIP_ACTIONS;
        $now = Date::now();
        $nowString = Date::toString($now);
        $staleThreshold = Date::toString(Date::subMinutes($now, 5));

        // Transaction for atomic claim (uses savepoints when nested)
        Transaction::begin();

        // Select ready actions with row-level locking, skipping locked rows
        // Ready = pending, deferred time passed (or null), not currently processing (or stale)
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE status = %s
                   AND (deferred_until IS NULL OR deferred_until <= %s)
                   AND (processing_at IS NULL OR processing_at < %s)
                 ORDER BY deferred_until ASC, id ASC
                 LIMIT %d
                 FOR UPDATE SKIP LOCKED",
                ActionStatus::Pending->value,
                $nowString,
                $staleThreshold,
                $limit
            ),
            ARRAY_A
        );

        if ($rows === null || $rows === []) {
            Transaction::commit();
            return [];
        }

        // Get the IDs we selected
        $ids = array_map(fn(array $row) => (int) $row['id'], $rows);
        $idPlaceholders = implode(',', array_fill(0, count($ids), '%d'));

        // Update all claimed rows to Running status
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$table}
                 SET status = %s, processing_at = %s, updated_at = %s
                 WHERE id IN ({$idPlaceholders})",
                ActionStatus::Running->value,
                $nowString,
                $nowString,
                ...$ids
            )
        );

        Transaction::commit();

        // Hydrate and return the actions with updated status
        return array_map(function (array $row) use ($nowString): Action {
            $row['status'] = ActionStatus::Running->value;
            $row['processing_at'] = $nowString;
            return $this->hydrate($row);
        }, $rows);
    }

    /**
     * Hydrate a model from a database row.
     *
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): Action
    {
        // Map DB column name to model property name
        if (isset($row['action_type'])) {
            $row['type'] = $row['action_type'];
            unset($row['action_type']);
        }

        $model = Action::fromData(
            $row,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $model->syncOriginal();

        return $model;
    }

    /**
     * Serialize model values for database storage.
     *
     * @param array<string, mixed> $values
     * @return array<string, mixed>
     */
    private function serialize(array $values, Action $model): array
    {
        $row = [];

        foreach ($values as $key => $value) {
            // Skip unset properties - let database defaults apply
            if (!$model->isSet($key)) {
                continue;
            }

            // Skip id on insert (auto-increment)
            if ($key === 'id' && $value === null) {
                continue;
            }

            // Map model property name to DB column name
            $columnName = $key === 'type' ? 'action_type' : $key;

            $row[$columnName] = match (true) {
                $value instanceof BackedEnum => $value->value,
                $value instanceof DateTimeImmutable => $value->format('Y-m-d H:i:s'),
                is_array($value) => json_encode($value, JSON_THROW_ON_ERROR),
                default => $value,
            };
        }

        return $row;
    }
}
