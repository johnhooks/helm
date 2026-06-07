<?php

declare(strict_types=1);

namespace Helm\ShipLink\Broadcasting;

use Helm\Broadcasting\Broadcastable;
use Helm\Broadcasting\Channel;
use Helm\Broadcasting\EventType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Resources\ActionResource;

/**
 * Broadcasts a ship action lifecycle update.
 */
final class ShipActionUpdated implements Broadcastable
{
    public function __construct(
        private readonly Action $action,
    ) {
    }

    public function channel(): string
    {
        return Channel::privateShip($this->action->ship_post_id);
    }

    public function type(): EventType
    {
        return EventType::ShipActionUpdated;
    }

    /**
     * @return array{action: array<string, mixed>}
     */
    public function payload(): array
    {
        return [
            'action' => (new ActionResource($this->action))->resolve(),
        ];
    }

    public function resourceType(): ?string
    {
        return 'ship_action';
    }

    public function resourceId(): ?int
    {
        return $this->action->id;
    }
}
