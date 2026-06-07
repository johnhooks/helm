<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\Resources\ActionResource;
use Helm\ShipLink\Resources\ShipStateResource;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Resources\Resource
 * @covers \Helm\ShipLink\Resources\ActionResource
 * @covers \Helm\ShipLink\Resources\ShipStateResource
 */
class ResourcesTest extends WPTestCase
{
    public function tear_down(): void
    {
        Date::setTestNow(null);
        parent::tear_down();
    }

    public function test_action_resource_serializes_action(): void
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

        $resource = (new ActionResource($action))->resolve();

        $this->assertSame(123, $resource['id']);
        $this->assertSame(45, $resource['ship_post_id']);
        $this->assertSame('jump', $resource['type']);
        $this->assertSame('running', $resource['status']);
        $this->assertSame(['route_id' => 9], $resource['params']);
        $this->assertSame(['phase' => 1], $resource['result']);
        $this->assertSame('2026-06-07T12:35:56+00:00', $resource['deferred_until']);
    }

    public function test_ship_state_resource_serializes_operational_state(): void
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

        $resource = (new ShipStateResource($state))->resolve();

        $this->assertSame(45, $resource['id']);
        $this->assertSame('overdrive', $resource['power_mode']);
        $this->assertSame('2026-06-07T12:35:56+00:00', $resource['power_full_at']);
        $this->assertSame(120.0, $resource['power_max']);
        $this->assertSame(9, $resource['node_id']);
        $this->assertSame(123, $resource['current_action_id']);
    }
}
