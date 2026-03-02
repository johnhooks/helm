<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Ships\ShipIdentity;

/**
 * Simple ShipIdentity DTO for simulation.
 *
 * No WordPress post needed — just the three values the game loop uses.
 */
final readonly class SimShipIdentity implements ShipIdentity
{
    public function __construct(
        private int $postId,
        private string $name,
        private int $ownerId,
    ) {
    }

    public function postId(): int
    {
        return $this->postId;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function ownerId(): int
    {
        return $this->ownerId;
    }
}
