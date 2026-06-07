<?php

declare(strict_types=1);

namespace Helm\Broadcasting;

use Helm\Broadcasting\Contracts\EventRepository;

/**
 * Persists broadcastable domain events into the client-facing broadcast stream.
 */
final class Broadcaster
{
    public function __construct(
        private readonly EventRepository $events,
    ) {
    }

    public function handleEvent(mixed $event): void
    {
        if (! $event instanceof Broadcastable) {
            return;
        }

        $this->broadcast($event);
    }

    public function broadcast(Broadcastable $event): Event
    {
        return $this->events->append(new Event([
            'channel'       => $event->channel(),
            'type'          => $event->type(),
            'payload'       => $event->payload(),
            'resource_type' => $event->resourceType(),
            'resource_id'   => $event->resourceId(),
        ]));
    }
}
