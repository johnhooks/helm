<?php

declare(strict_types=1);

namespace Helm\ShipLink\Contracts;

use Helm\ShipLink\Models\ShipState;

/**
 * Repository contract for ship state operations.
 */
interface ShipStateRepository
{
    /**
     * Find ship state by post ID.
     *
     * @param int $shipPostId
     * @return ShipState|null
     */
    public function find(int $shipPostId): ?ShipState;

    /**
     * Find ship state for a user.
     *
     * @param int $userId
     * @return ShipState|null
     */
    public function findForUser(int $userId): ?ShipState;

    /**
     * Find or create ship state for a post ID.
     *
     * If no state record exists, creates one with defaults.
     *
     * @param int $shipPostId
     * @return ShipState
     */
    public function findOrCreate(int $shipPostId): ShipState;

    /**
     * Check if state exists for a ship.
     *
     * @param int $shipPostId
     * @return bool
     */
    public function exists(int $shipPostId): bool;

    /**
     * Insert a new ship state record.
     *
     * @param ShipState $state
     * @return bool
     */
    public function insert(ShipState $state): bool;

    /**
     * Update an existing ship state record.
     *
     * Uses dirty tracking for efficient partial updates.
     *
     * @param ShipState $state
     * @return bool
     */
    public function update(ShipState $state): bool;

    /**
     * Save ship state (insert or update).
     *
     * @param ShipState $state
     * @return bool
     */
    public function save(ShipState $state): bool;

    /**
     * Delete ship state by post ID.
     *
     * @param int $shipPostId
     * @return bool
     */
    public function delete(int $shipPostId): bool;

    /**
     * Get all ships at a specific node.
     *
     * @param int $nodeId
     * @return array<ShipState>
     */
    public function findAtNode(int $nodeId): array;

    /**
     * Get ships with a current action.
     *
     * @return array<ShipState>
     */
    public function findWithCurrentAction(): array;

    /**
     * Update just the node_id for a ship.
     *
     * @param int $shipPostId
     * @param int|null $nodeId
     * @return bool
     */
    public function updateNodeId(int $shipPostId, ?int $nodeId): bool;

    /**
     * Update just the current_action_id for a ship.
     *
     * @param int $shipPostId
     * @param int|null $actionId
     * @return bool
     */
    public function updateCurrentAction(int $shipPostId, ?int $actionId): bool;

    /**
     * Lock a ship's state row for update within a transaction.
     *
     * Returns the current_action_id (null if slot is free).
     * Must be called within an active transaction.
     *
     * @param int $shipPostId
     * @return int|null
     * @throws \RuntimeException If row is locked by another transaction
     */
    public function lockForUpdate(int $shipPostId): ?int;
}
