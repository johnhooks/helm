<?php

declare(strict_types=1);

namespace Tests\Wpunit\Broadcasting;

use Helm\Broadcasting\EventType;
use Helm\ShipLink\Broadcasting\ShipActionUpdated;
use Helm\ShipLink\Broadcasting\ShipStateUpdated;
use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Models\ShipState;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Broadcasting\ShipActionUpdated
 * @covers \Helm\ShipLink\Broadcasting\ShipStateUpdated
 */
class BroadcastableEventsTest extends WPTestCase
{
    public function tear_down(): void
    {
        Date::setTestNow(null);
        parent::tear_down();
    }

    public function test_ship_action_updated_defines_broadcast_contract(): void
    {
        Date::setTestNow('2026-06-07 12:34:56');

        $action = new Action([
            'id' => 123,
            'ship_post_id' => 45,
            'type' => ActionType::Jump,
            'status' => ActionStatus::Running,
            'params' => ['route_id' => 9],
            'result' => ['phase' => 1],
            'deferred_until' => Date::addSeconds(Date::now(), 60),
            'created_at' => Date::now(),
            'updated_at' => Date::now(),
        ]);

        $event = new ShipActionUpdated($action);
        $payload = $event->payload();

        $this->assertSame('private-ship.45', $event->channel());
        $this->assertSame(EventType::ShipActionUpdated, $event->type());
        $this->assertSame('ship_action', $event->resourceType());
        $this->assertSame(123, $event->resourceId());
        $this->assertSame(123, $payload['action']['id']);
        $this->assertSame('jump', $payload['action']['type']);
        $this->assertSame('running', $payload['action']['status']);
        $this->assertSame(['route_id' => 9], $payload['action']['params']);
        $this->assertSame(['phase' => 1], $payload['action']['result']);
        $this->assertSame('2026-06-07T12:35:56+00:00', $payload['action']['deferred_until']);
    }

    public function test_ship_state_updated_defines_broadcast_contract(): void
    {
        Date::setTestNow('2026-06-07 12:34:56');

        $state = new ShipState([
            'ship_post_id' => 45,
            'power_mode' => PowerMode::Overdrive,
            'power_full_at' => Date::addSeconds(Date::now(), 60),
            'power_max' => 120.0,
            'shields_full_at' => Date::addSeconds(Date::now(), 120),
            'shields_max' => 80.0,
            'hull_integrity' => 75.5,
            'hull_max' => 100.0,
            'node_id' => 9,
            'current_action_id' => 123,
            'created_at' => Date::now(),
            'updated_at' => Date::now(),
        ]);

        $event = new ShipStateUpdated($state);
        $payload = $event->payload();

        $this->assertSame('private-ship.45', $event->channel());
        $this->assertSame(EventType::ShipStateUpdated, $event->type());
        $this->assertSame('ship', $event->resourceType());
        $this->assertSame(45, $event->resourceId());
        $this->assertSame(45, $payload['ship_state']['id']);
        $this->assertSame('overdrive', $payload['ship_state']['power_mode']);
        $this->assertSame('2026-06-07T12:35:56+00:00', $payload['ship_state']['power_full_at']);
        $this->assertSame(120.0, $payload['ship_state']['power_max']);
        $this->assertSame(9, $payload['ship_state']['node_id']);
        $this->assertSame(123, $payload['ship_state']['current_action_id']);
    }
}
