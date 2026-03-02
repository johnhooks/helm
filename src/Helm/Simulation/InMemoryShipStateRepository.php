<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Lib\Date;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Models\ShipState;

/**
 * In-memory ship state repository for simulation.
 */
final class InMemoryShipStateRepository implements ShipStateRepository
{
    /** @var array<int, ShipState> Indexed by ship_post_id */
    private array $states = [];

    public function find(int $shipPostId): ?ShipState
    {
        return $this->states[$shipPostId] ?? null;
    }

    public function findForUser(int $userId): ?ShipState
    {
        throw new \BadMethodCallException('InMemoryShipStateRepository::findForUser() is not implemented.');
    }

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

    public function exists(int $shipPostId): bool
    {
        return isset($this->states[$shipPostId]);
    }

    public function insert(ShipState $state): bool
    {
        $now = Date::now();
        $state->created_at = $now;
        $state->updated_at = $now;

        $this->states[$state->ship_post_id] = $state;
        $state->syncOriginal();

        return true;
    }

    public function update(ShipState $state): bool
    {
        if (!$this->exists($state->ship_post_id)) {
            return false;
        }

        $state->updated_at = Date::now();
        $this->states[$state->ship_post_id] = $state;
        $state->syncOriginal();

        return true;
    }

    public function save(ShipState $state): bool
    {
        if (!$this->exists($state->ship_post_id)) {
            return $this->insert($state);
        }

        return $this->update($state);
    }

    public function delete(int $shipPostId): bool
    {
        if (!isset($this->states[$shipPostId])) {
            return false;
        }

        unset($this->states[$shipPostId]);

        return true;
    }

    public function findAtNode(int $nodeId): array
    {
        throw new \BadMethodCallException('InMemoryShipStateRepository::findAtNode() is not implemented.');
    }

    public function findWithCurrentAction(): array
    {
        throw new \BadMethodCallException('InMemoryShipStateRepository::findWithCurrentAction() is not implemented.');
    }

    public function updateNodeId(int $shipPostId, ?int $nodeId): bool
    {
        $state = $this->find($shipPostId);
        if ($state === null) {
            return false;
        }

        $state->node_id = $nodeId;
        $state->updated_at = Date::now();
        $state->syncOriginal();

        return true;
    }

    public function updateCurrentAction(int $shipPostId, ?int $actionId): bool
    {
        $state = $this->find($shipPostId);
        if ($state === null) {
            return false;
        }

        $state->current_action_id = $actionId;
        $state->updated_at = Date::now();
        $state->syncOriginal();

        return true;
    }

    /**
     * No locking needed in simulation — just return the current action ID.
     */
    public function lockForUpdate(int $shipPostId): ?int
    {
        $state = $this->find($shipPostId);

        return $state?->current_action_id;
    }
}
