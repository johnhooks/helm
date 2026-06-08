<?php

declare(strict_types=1);

namespace Tests\Wpunit\Broadcasting;

use Helm\Broadcasting\Channel;
use Helm\Broadcasting\Contracts\EventRepository;
use Helm\Broadcasting\Event;
use Helm\Broadcasting\EventType;
use Helm\Broadcasting\Heartbeat;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Broadcasting\Heartbeat
 *
 * @property WpunitTester $tester
 */
class HeartbeatTest extends WPTestCase
{
    private EventRepository $events;
    private Heartbeat $heartbeat;
    private int $ownerId;
    private int $otherId;

    public function set_up(): void
    {
        parent::set_up();

        $this->tester->haveOrigin();

        $this->events = helm(EventRepository::class);
        $this->heartbeat = helm(Heartbeat::class);
        $this->ownerId = self::factory()->user->create(['role' => 'subscriber']);
        $this->otherId = self::factory()->user->create(['role' => 'subscriber']);
    }

    public function test_ignores_request_without_helm_broadcast_key(): void
    {
        $response = $this->heartbeat->handle([], ['some_other_key' => true]);

        $this->assertArrayNotHasKey('helm_broadcast', $response);
    }

    public function test_returns_events_for_authorized_channel_cursor(): void
    {
        $ship = $this->tester->haveShip(['ownerId' => $this->ownerId]);
        $channel = Channel::privateShip($ship->postId());
        $event = $this->events->append(new Event([
            'channel' => $channel,
            'type' => EventType::ShipStateUpdated,
            'payload' => ['ship_state' => ['id' => $ship->postId()]],
            'resource_type' => 'ship',
            'resource_id' => $ship->postId(),
        ]));

        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_broadcast' => [
                'channels' => [$channel => 0],
            ],
        ]);

        $channelResponse = $response['helm_broadcast']['channels'][$channel];

        $this->assertSame($event->id, $channelResponse['cursor']);
        $this->assertCount(1, $channelResponse['events']);
        $this->assertSame($event->id, $channelResponse['events'][0]['id']);
        $this->assertSame('ship.state.updated', $channelResponse['events'][0]['type']);
    }

    public function test_null_cursor_initializes_channel_without_replaying_events(): void
    {
        $ship = $this->tester->haveShip(['ownerId' => $this->ownerId]);
        $channel = Channel::privateShip($ship->postId());
        $event = $this->events->append(new Event([
            'channel' => $channel,
            'type' => EventType::ShipStateUpdated,
            'payload' => ['ship_state' => ['id' => $ship->postId()]],
        ]));

        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_broadcast' => [
                'channels' => [$channel => null],
            ],
        ]);

        $channelResponse = $response['helm_broadcast']['channels'][$channel];

        $this->assertSame([], $channelResponse['events']);
        $this->assertSame($event->id, $channelResponse['cursor']);
    }

    public function test_forbidden_channel_returns_serialized_rest_error(): void
    {
        $ship = $this->tester->haveShip(['ownerId' => $this->otherId]);
        $channel = Channel::privateShip($ship->postId());

        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_broadcast' => [
                'channels' => [$channel => 0],
            ],
        ]);

        $error = $response['helm_broadcast']['channels'][$channel]['error'];

        $this->assertSame('helm.broadcast.channel_forbidden', $error['code']);
        $this->assertSame(403, $error['data']['status']);
    }

    public function test_too_many_channels_returns_error_without_results(): void
    {
        $channels = [];
        for ($i = 1; $i <= 20; $i++) {
            $channels['private-ship.' . $i] = 0;
        }

        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_broadcast' => [
                'channels' => $channels,
            ],
        ]);

        $this->assertSame([], $response['helm_broadcast']['channels']);
        $this->assertSame('helm.broadcast.too_many_channels', $response['helm_broadcast']['error']['code']);
        $this->assertSame(400, $response['helm_broadcast']['error']['data']['status']);
    }
}
