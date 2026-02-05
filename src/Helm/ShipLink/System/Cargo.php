<?php

declare(strict_types=1);

namespace Helm\ShipLink\System;

use Helm\ShipLink\Contracts\Cargo as CargoContract;
use Helm\ShipLink\Models\ShipSystems;

/**
 * Cargo system implementation.
 *
 * Manages the ship's cargo hold - resources collected, traded, or transported.
 *
 * This system is read-only - it reports state and calculates values.
 * Ship is responsible for all mutations to ShipSystems.
 */
final class Cargo implements CargoContract
{
    public function __construct(
        private ShipSystems $systems,
    ) {
    }

    public function quantity(string $resource): int
    {
        return $this->systems->cargo[$resource] ?? 0;
    }

    public function all(): array
    {
        return $this->systems->cargo;
    }

    public function total(): int
    {
        return array_sum($this->systems->cargo);
    }

    public function has(string $resource, int $quantity): bool
    {
        return $this->quantity($resource) >= $quantity;
    }

    public function isEmpty(): bool
    {
        return $this->systems->cargo === [];
    }

    public function calculateCargoAfterAdd(string $resource, int $quantity): array
    {
        $cargo = $this->systems->cargo;
        $current = $cargo[$resource] ?? 0;
        $cargo[$resource] = $current + $quantity;

        return $cargo;
    }

    public function calculateCargoAfterRemove(string $resource, int $quantity): array
    {
        $cargo = $this->systems->cargo;
        $current = $cargo[$resource] ?? 0;
        $removed = min($current, $quantity);

        if ($removed >= $current) {
            unset($cargo[$resource]);
        } else {
            $cargo[$resource] = $current - $removed;
        }

        return ['cargo' => $cargo, 'removed' => $removed];
    }
}
