<?php

declare(strict_types=1);

namespace Tests\Support;

use Helm\Events\Contracts\Event;
use Helm\Events\Contracts\EventDispatcher;

/**
 * Records dispatched domain events for tests.
 */
final class RecordingEventDispatcher implements EventDispatcher
{
    /**
     * @var array<Event>
     */
    public array $events = [];

    public function dispatch(Event $event): void
    {
        $this->events[] = $event;
    }
}
