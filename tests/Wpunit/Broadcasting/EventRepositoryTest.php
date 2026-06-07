<?php

declare(strict_types=1);

namespace Tests\Wpunit\Broadcasting;

use DateTimeImmutable;
use DateTimeZone;
use Helm\Broadcasting\Channel;
use Helm\Broadcasting\Contracts\EventRepository;
use Helm\Broadcasting\Event;
use Helm\Broadcasting\EventType;
use Helm\Lib\Date;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Broadcasting\WpdbEventRepository
 * @covers \Helm\Broadcasting\Event
 * @covers \Helm\Broadcasting\Channel
 */
class EventRepositoryTest extends WPTestCase
{
    private EventRepository $repository;

    public function _before(): void
    {
        parent::_before();

        $this->repository = helm(EventRepository::class);
    }

    public function tear_down(): void
    {
        Date::setTestNow(null);
        parent::tear_down();
    }

    public function test_append_persists_event_payload_and_resource_reference(): void
    {
        Date::setTestNow(new DateTimeImmutable('2026-06-07 12:34:56', new DateTimeZone('UTC')));

        $event = $this->repository->append(new Event([
            'channel' => Channel::privateShip(45),
            'type' => EventType::ShipActionUpdated,
            'payload' => [
                'action' => [
                    'id' => 123,
                    'status' => 'running',
                ],
            ],
            'resource_type' => 'ship_action',
            'resource_id' => 123,
        ]));

        $this->assertIsInt($event->id);
        $this->assertGreaterThan(0, $event->id);
        $this->assertSame('private-ship.45', $event->channel);
        $this->assertSame(EventType::ShipActionUpdated, $event->type);
        $this->assertSame(['action' => ['id' => 123, 'status' => 'running']], $event->payload);
        $this->assertSame('ship_action', $event->resource_type);
        $this->assertSame(123, $event->resource_id);
        $this->assertSame('2026-06-07 12:34:56', Date::toString($event->created_at));
    }

    public function test_find_after_cursor_returns_events_for_channel_in_id_order(): void
    {
        $ship45First = $this->repository->append(new Event([
            'channel' => Channel::privateShip(45),
            'type' => EventType::ShipActionUpdated,
            'payload' => ['action' => ['id' => 1]],
            'resource_type' => 'ship_action',
            'resource_id' => 1,
        ]));

        $this->repository->append(new Event([
            'channel' => Channel::privateShip(99),
            'type' => EventType::ShipActionUpdated,
            'payload' => ['action' => ['id' => 2]],
            'resource_type' => 'ship_action',
            'resource_id' => 2,
        ]));

        $ship45Second = $this->repository->append(new Event([
            'channel' => Channel::privateShip(45),
            'type' => EventType::ShipStateUpdated,
            'payload' => ['ship_state' => ['id' => 45]],
            'resource_type' => 'ship',
            'resource_id' => 45,
        ]));

        $events = $this->repository->findAfterCursorForChannel(Channel::privateShip(45), 0);

        $this->assertCount(2, $events);
        $this->assertSame([$ship45First->id, $ship45Second->id], array_map(fn (Event $event) => $event->id, $events));
        $this->assertSame(EventType::ShipActionUpdated, $events[0]->type);
        $this->assertSame(EventType::ShipStateUpdated, $events[1]->type);
    }

    public function test_find_after_cursor_excludes_events_at_or_before_cursor(): void
    {
        $first = $this->repository->append(new Event([
            'channel' => Channel::privateShip(45),
            'type' => EventType::ShipActionUpdated,
            'payload' => ['action' => ['id' => 1]],
        ]));

        $second = $this->repository->append(new Event([
            'channel' => Channel::privateShip(45),
            'type' => EventType::ShipActionUpdated,
            'payload' => ['action' => ['id' => 2]],
        ]));

        $events = $this->repository->findAfterCursorForChannel(Channel::privateShip(45), $first->id ?? 0);

        $this->assertCount(1, $events);
        $this->assertSame($second->id, $events[0]->id);
    }

    public function test_find_after_cursor_respects_limit(): void
    {
        for ($i = 1; $i <= 3; $i++) {
            $this->repository->append(new Event([
                'channel' => Channel::privateShip(45),
                'type' => EventType::ShipActionUpdated,
                'payload' => ['action' => ['id' => $i]],
            ]));
        }

        $events = $this->repository->findAfterCursorForChannel(Channel::privateShip(45), 0, 2);

        $this->assertCount(2, $events);
        $this->assertSame([1, 2], array_map(fn (Event $event) => $event->payload['action']['id'], $events));
    }

    public function test_append_allows_events_without_resource_reference(): void
    {
        $event = $this->repository->append(new Event([
            'channel' => Channel::privateShip(45),
            'type' => EventType::ShipStateUpdated,
            'payload' => ['ship_state' => ['id' => 45]],
        ]));

        $events = $this->repository->findAfterCursorForChannel(Channel::privateShip(45), 0);

        $this->assertNull($event->resource_type);
        $this->assertNull($event->resource_id);
        $this->assertCount(1, $events);
        $this->assertNull($events[0]->resource_type);
        $this->assertNull($events[0]->resource_id);
    }
}
