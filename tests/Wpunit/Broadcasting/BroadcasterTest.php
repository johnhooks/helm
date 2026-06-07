<?php

declare(strict_types=1);

namespace Tests\Wpunit\Broadcasting;

use DateTimeImmutable;
use DateTimeZone;
use Helm\Broadcasting\Broadcaster;
use Helm\Broadcasting\Contracts\EventRepository;
use Helm\Broadcasting\EventType;
use Helm\Events\Contracts\EventDispatcher;
use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Broadcasting\ShipActionUpdated;
use Helm\ShipLink\Models\Action;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Broadcasting\Broadcaster
 */
class BroadcasterTest extends WPTestCase
{
    private Broadcaster $broadcaster;
    private EventRepository $events;
    private EventDispatcher $dispatcher;

    public function _before(): void
    {
        parent::_before();

        $this->broadcaster = helm(Broadcaster::class);
        $this->events = helm(EventRepository::class);
        $this->dispatcher = helm(EventDispatcher::class);
    }

    public function tear_down(): void
    {
        Date::setTestNow(null);
        parent::tear_down();
    }

    public function test_broadcast_appends_an_event(): void
    {
        Date::setTestNow(new DateTimeImmutable('2026-06-07 12:34:56', new DateTimeZone('UTC')));

        $event = $this->broadcaster->broadcast(new ShipActionUpdated($this->action()));

        $this->assertIsInt($event->id);
        $this->assertSame('private-ship.45', $event->channel);
        $this->assertSame(EventType::ShipActionUpdated, $event->type);
        $this->assertSame(123, $event->payload['action']['id']);
        $this->assertSame('ship_action', $event->resource_type);
        $this->assertSame(123, $event->resource_id);
        $this->assertSame('2026-06-07 12:34:56', Date::toString($event->created_at));

        $stored = $this->events->findAfterCursorForChannel('private-ship.45', 0);

        $this->assertCount(1, $stored);
        $this->assertSame($event->id, $stored[0]->id);
    }

    public function test_handle_event_ignores_non_broadcastable_events(): void
    {
        $this->broadcaster->handleEvent((object) ['type' => 'domain.event']);

        $this->assertSame([], $this->events->findAfterCursorForChannel('private-ship.45', 0));
    }

    public function test_dispatching_broadcastable_domain_event_persists_it(): void
    {
        Date::setTestNow(new DateTimeImmutable('2026-06-07 12:34:56', new DateTimeZone('UTC')));

        $this->dispatcher->dispatch(new ShipActionUpdated($this->action()));

        $events = $this->events->findAfterCursorForChannel('private-ship.45', 0);

        $this->assertCount(1, $events);
        $this->assertSame(EventType::ShipActionUpdated, $events[0]->type);
        $this->assertSame(123, $events[0]->payload['action']['id']);
    }

    private function action(): Action
    {
        return new Action([
            'id' => 123,
            'ship_post_id' => 45,
            'type' => ActionType::Jump,
            'status' => ActionStatus::Running,
            'params' => ['route_id' => 9],
            'created_at' => Date::now(),
            'updated_at' => Date::now(),
        ]);
    }
}
