<?php

declare(strict_types=1);

namespace Helm\Ships;

/**
 * Service for ship operations.
 */
final class ShipService
{
    private const DEFAULT_START_LOCATION = 'SOL';
    private const DEFAULT_START_CREDITS = 10000;

    public function __construct(
        private readonly ShipRepository $repository,
    ) {
    }

    /**
     * Create a new ship.
     */
    public function create(string $name, int $ownerId, ?string $id = null): Ship
    {
        $ship = new Ship(
            id: $id ?? $this->generateId($name),
            name: $name,
            ownerId: $ownerId,
            location: self::DEFAULT_START_LOCATION,
            credits: self::DEFAULT_START_CREDITS,
            cargo: [],
            artifacts: [],
            createdAt: time(),
            updatedAt: time(),
        );

        $this->repository->save($ship);

        return $ship;
    }

    /**
     * Get the ship for a user.
     *
     * In the one-ship-per-user model, each user has at most one ship.
     */
    public function getForUser(int $userId): ?Ship
    {
        return $this->repository->getByOwner($userId);
    }

    /**
     * Get or create a ship for a user.
     *
     * If the user already has a ship, returns it.
     * Otherwise creates a new ship with the given name.
     *
     * This enforces the one-ship-per-user constraint at the service level.
     */
    public function getOrCreateForUser(int $userId, string $name): Ship
    {
        $existing = $this->repository->getByOwner($userId);

        if ($existing !== null) {
            return $existing;
        }

        return $this->create($name, $userId);
    }

    /**
     * Check if a user has a ship.
     */
    public function userHasShip(int $userId): bool
    {
        return $this->repository->ownerHasShip($userId);
    }

    /**
     * Get a ship by ID.
     */
    public function get(string $id): ?Ship
    {
        return $this->repository->get($id);
    }

    /**
     * Get all ships.
     *
     * @return array<Ship>
     */
    public function all(): array
    {
        return $this->repository->all();
    }

    /**
     * Update a ship's location.
     */
    public function updateLocation(string $id, string $starId): void
    {
        $ship = $this->get($id);

        if ($ship === null) {
            throw new \InvalidArgumentException("Ship not found: {$id}");
        }

        $updated = $ship->withLocation($starId);
        $this->repository->save($updated);
    }

    /**
     * Add cargo to a ship.
     */
    public function addCargo(string $id, string $resource, int $quantity): void
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('Quantity must be positive');
        }

        $ship = $this->get($id);

        if ($ship === null) {
            throw new \InvalidArgumentException("Ship not found: {$id}");
        }

        $cargo = $ship->cargo;
        $cargo[$resource] = ($cargo[$resource] ?? 0) + $quantity;

        $updated = $ship->withCargo($cargo);
        $this->repository->save($updated);
    }

    /**
     * Remove cargo from a ship.
     */
    public function removeCargo(string $id, string $resource, int $quantity): void
    {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('Quantity must be positive');
        }

        $ship = $this->get($id);

        if ($ship === null) {
            throw new \InvalidArgumentException("Ship not found: {$id}");
        }

        $current = $ship->cargo[$resource] ?? 0;

        if ($current < $quantity) {
            throw new \InvalidArgumentException(
                "Insufficient cargo: have {$current}, need {$quantity}"
            );
        }

        $cargo = $ship->cargo;
        $cargo[$resource] = $current - $quantity;

        if ($cargo[$resource] === 0) {
            unset($cargo[$resource]);
        }

        $updated = $ship->withCargo($cargo);
        $this->repository->save($updated);
    }

    /**
     * Add credits to a ship.
     */
    public function addCredits(string $id, int $amount): void
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Amount must be positive');
        }

        $ship = $this->get($id);

        if ($ship === null) {
            throw new \InvalidArgumentException("Ship not found: {$id}");
        }

        $updated = $ship->withCredits($ship->credits + $amount);
        $this->repository->save($updated);
    }

    /**
     * Remove credits from a ship.
     */
    public function removeCredits(string $id, int $amount): void
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Amount must be positive');
        }

        $ship = $this->get($id);

        if ($ship === null) {
            throw new \InvalidArgumentException("Ship not found: {$id}");
        }

        if ($ship->credits < $amount) {
            throw new \InvalidArgumentException(
                "Insufficient credits: have {$ship->credits}, need {$amount}"
            );
        }

        $updated = $ship->withCredits($ship->credits - $amount);
        $this->repository->save($updated);
    }

    /**
     * Delete a ship.
     */
    public function delete(string $id): void
    {
        $this->repository->delete($id);
    }

    /**
     * Generate a ship ID from name.
     */
    private function generateId(string $name): string
    {
        $base = 'ship-' . sanitize_title($name);

        // Check for uniqueness
        if ($this->get($base) === null) {
            return $base;
        }

        // Add suffix for uniqueness
        $suffix = 1;
        while ($this->get("{$base}-{$suffix}") !== null) {
            $suffix++;
        }

        return "{$base}-{$suffix}";
    }
}
