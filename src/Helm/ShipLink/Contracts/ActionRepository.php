<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use DateTimeImmutable;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Models\Action;

/**
 * Repository contract for ship action operations.
 */
interface ActionRepository
{
    /**
     * Find an action by ID.
     *
     * @param int $id
     * @return Action|null
     */
    public function find(int $id): ?Action;

    /**
     * Find actions for a ship with cursor-based pagination.
     *
     * @param int $shipPostId
     * @param int $perPage
     * @param int|null $before
     * @return array{actions: array<Action>, has_more: bool}
     */
    public function findForShipPaginated(int $shipPostId, int $perPage = 20, ?int $before = null): array;

    /**
     * Find all actions for a ship.
     *
     * @param int $shipPostId
     * @param int|null $limit
     * @return array<Action>
     */
    public function findForShip(int $shipPostId, ?int $limit = null): array;

    /**
     * Find the current (non-complete) action for a ship.
     *
     * @param int $shipPostId
     * @return Action|null
     */
    public function findCurrentForShip(int $shipPostId): ?Action;

    /**
     * Find all pending actions ready to process.
     *
     * @return array<Action>
     */
    public function findPending(): array;

    /**
     * Find all running actions.
     *
     * @return array<Action>
     */
    public function findRunning(): array;

    /**
     * Find actions that are deferred until a specific time or earlier.
     *
     * @param DateTimeImmutable $until
     * @return array<Action>
     */
    public function findDeferredUntil(DateTimeImmutable $until): array;

    /**
     * Find actions by status.
     *
     * @param ActionStatus $status
     * @param int|null $limit
     * @return array<Action>
     */
    public function findByStatus(ActionStatus $status, ?int $limit = null): array;

    /**
     * Insert a new action.
     *
     * @param Action $action
     * @return bool
     */
    public function insert(Action $action): bool;

    /**
     * Update an existing action.
     *
     * @param Action $action
     * @return bool
     */
    public function update(Action $action): bool;

    /**
     * Save an action (insert or update).
     *
     * @param Action $action
     * @return bool
     */
    public function save(Action $action): bool;

    /**
     * Delete an action by ID.
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool;

    /**
     * Delete all actions for a ship.
     *
     * @param int $shipPostId
     * @return int Number of deleted records
     */
    public function deleteForShip(int $shipPostId): int;

    /**
     * Delete completed actions older than a certain age.
     *
     * @param DateTimeImmutable $olderThan
     * @return int Number of deleted records
     */
    public function deleteOldCompleted(DateTimeImmutable $olderThan): int;

    /**
     * Count actions by status.
     *
     * @return array<string, int>
     */
    public function countByStatus(): array;

    /**
     * Count total actions.
     *
     * @return int
     */
    public function count(): int;

    /**
     * Claim a batch of ready actions for processing.
     *
     * Uses SKIP LOCKED for non-blocking concurrent access.
     * Actions are atomically marked as Running before being returned.
     *
     * @param int $limit
     * @return array<Action> Claimed actions (already marked as Running)
     */
    public function claimReady(int $limit = 50): array;

    /**
     * Find all actions broadcast since a given time for a user's ships.
     *
     * @param DateTimeImmutable $since
     * @param int $userId
     * @return array<Action>
     */
    public function findBroadcastsSince(DateTimeImmutable $since, int $userId): array;

    /**
     * Atomically claim a single action for processing.
     *
     * Transitions the action from Pending to Running status.
     *
     * @param int $actionId
     * @return bool True if the action was successfully claimed
     */
    public function claim(int $actionId): bool;
}
