<?php

declare(strict_types=1);

namespace Helm\Simulation;

use DateTimeImmutable;
use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Models\Action;

/**
 * In-memory action repository for simulation.
 */
final class InMemoryActionRepository implements ActionRepository
{
    /** @var array<int, Action> Indexed by action ID */
    private array $actions = [];

    private int $nextId = 1;

    public function find(int $id): ?Action
    {
        return $this->actions[$id] ?? null;
    }

    public function findForShipPaginated(int $shipPostId, int $perPage = 20, ?int $before = null): array
    {
        throw new \BadMethodCallException('InMemoryActionRepository::findForShipPaginated() is not implemented.');
    }

    public function findForShip(int $shipPostId, ?int $limit = null): array
    {
        throw new \BadMethodCallException('InMemoryActionRepository::findForShip() is not implemented.');
    }

    public function findCurrentForShip(int $shipPostId): ?Action
    {
        throw new \BadMethodCallException('InMemoryActionRepository::findCurrentForShip() is not implemented.');
    }

    public function findPending(): array
    {
        return array_values(array_filter(
            $this->actions,
            static fn (Action $a) => $a->status === ActionStatus::Pending,
        ));
    }

    public function findRunning(): array
    {
        throw new \BadMethodCallException('InMemoryActionRepository::findRunning() is not implemented.');
    }

    public function findDeferredUntil(DateTimeImmutable $until): array
    {
        return array_values(array_filter(
            $this->actions,
            static fn (Action $a) => $a->status === ActionStatus::Pending
                && $a->deferred_until !== null
                && $a->deferred_until <= $until,
        ));
    }

    public function findByStatus(ActionStatus $status, ?int $limit = null): array
    {
        throw new \BadMethodCallException('InMemoryActionRepository::findByStatus() is not implemented.');
    }

    public function insert(Action $action): bool
    {
        $now = Date::now();
        $action->id = $this->nextId++;
        $action->created_at = $now;
        $action->updated_at = $now;

        $this->actions[$action->id] = $action;
        $action->syncOriginal();

        return true;
    }

    public function update(Action $action): bool
    {
        if ($action->id === null || !isset($this->actions[$action->id])) {
            return false;
        }

        $action->updated_at = Date::now();
        $this->actions[$action->id] = $action;
        $action->syncOriginal();

        return true;
    }

    public function save(Action $action): bool
    {
        if ($action->id === null) {
            return $this->insert($action);
        }

        return $this->update($action);
    }

    public function delete(int $id): bool
    {
        if (!isset($this->actions[$id])) {
            return false;
        }

        unset($this->actions[$id]);

        return true;
    }

    public function deleteForShip(int $shipPostId): int
    {
        throw new \BadMethodCallException('InMemoryActionRepository::deleteForShip() is not implemented.');
    }

    public function deleteOldCompleted(DateTimeImmutable $olderThan): int
    {
        throw new \BadMethodCallException('InMemoryActionRepository::deleteOldCompleted() is not implemented.');
    }

    public function countByStatus(): array
    {
        throw new \BadMethodCallException('InMemoryActionRepository::countByStatus() is not implemented.');
    }

    public function count(): int
    {
        return count($this->actions);
    }

    /**
     * Claim ready actions — filter pending + deferred_until passed, transition to Running.
     */
    public function claimReady(int $limit = 50): array
    {
        $now = Date::now();
        $claimed = [];

        foreach ($this->actions as $action) {
            if (count($claimed) >= $limit) {
                break;
            }

            if ($action->status !== ActionStatus::Pending) {
                continue;
            }

            if ($action->deferred_until !== null && $action->deferred_until > $now) {
                continue;
            }

            $action->start();
            $action->updated_at = Date::now();
            $action->syncOriginal();
            $claimed[] = $action;
        }

        return $claimed;
    }

    public function findBroadcastsSince(DateTimeImmutable $since, int $userId): array
    {
        throw new \BadMethodCallException('InMemoryActionRepository::findBroadcastsSince() is not implemented.');
    }

    /**
     * Claim a single action — transition from Pending to Running.
     */
    public function claim(int $actionId): bool
    {
        $action = $this->find($actionId);
        if ($action === null || $action->status !== ActionStatus::Pending) {
            return false;
        }

        $action->start();
        $action->updated_at = Date::now();
        $action->syncOriginal();

        return true;
    }
}
