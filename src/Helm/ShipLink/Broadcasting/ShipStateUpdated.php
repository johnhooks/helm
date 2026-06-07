<?php

declare(strict_types=1);

namespace Helm\ShipLink\Broadcasting;

use Helm\Broadcasting\Broadcastable;
use Helm\Broadcasting\Channel;
use Helm\Broadcasting\EventType;
use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\Resources\ShipStateResource;

/**
 * Broadcasts an operational ship state update.
 */
final class ShipStateUpdated implements Broadcastable
{
    public function __construct(
        private readonly ShipState $state,
    ) {
    }

    public function channel(): string
    {
        return Channel::privateShip($this->state->ship_post_id);
    }

    public function type(): EventType
    {
        return EventType::ShipStateUpdated;
    }

    /**
     * @return array{ship_state: array<string, mixed>}
     */
    public function payload(): array
    {
        return [
            'ship_state' => (new ShipStateResource($this->state))->resolve(),
        ];
    }

    public function resourceType(): ?string
    {
        return 'ship';
    }

    public function resourceId(): ?int
    {
        return $this->state->ship_post_id;
    }
}
