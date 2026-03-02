<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\Lib\Date;
use Helm\ShipLink\ActionHeartbeat;
use Helm\ShipLink\WpdbActionRepository;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ActionHeartbeat
 *
 * @property WpunitTester $tester
 */
class ActionHeartbeatTest extends \Codeception\TestCase\WPTestCase
{
    private WpdbActionRepository $repository;
    private ActionHeartbeat $heartbeat;

    private int $ownerId;
    private int $otherId;

    public function set_up(): void
    {
        parent::set_up();

        $this->tester->haveOrigin();

        $this->repository = new WpdbActionRepository();
        $this->heartbeat  = new ActionHeartbeat($this->repository);

        $this->ownerId = self::factory()->user->create(['role' => 'subscriber']);
        $this->otherId = self::factory()->user->create(['role' => 'subscriber']);
    }

    public function test_ignores_request_without_helm_actions_key(): void
    {
        $response = $this->heartbeat->handle([], ['some_other_key' => true]);

        $this->assertArrayNotHasKey('helm_actions', $response);
    }

    public function test_ignores_logged_out_user(): void
    {
        wp_set_current_user(0);

        $response = $this->heartbeat->handle([], [
            'helm_actions' => [],
        ]);

        $this->assertArrayNotHasKey('helm_actions', $response);
    }

    public function test_returns_empty_actions_when_none_broadcast(): void
    {
        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_actions' => [],
        ]);

        $this->assertArrayHasKey('helm_actions', $response);
        $this->assertSame([], $response['helm_actions']['actions']);
        $this->assertArrayHasKey('server_time', $response['helm_actions']);
    }

    public function test_returns_broadcast_actions_for_owner(): void
    {
        $ship   = $this->tester->haveShip(['ownerId' => $this->ownerId]);
        $action = $this->insertAction($ship->postId());

        // Transition to running to set broadcast_at
        $action->start();
        $this->repository->update($action);

        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_actions' => [],
        ]);

        $this->assertCount(1, $response['helm_actions']['actions']);
        $this->assertSame($action->id, $response['helm_actions']['actions'][0]['id']);
        $this->assertSame($ship->postId(), $response['helm_actions']['actions'][0]['ship_post_id']);
    }

    public function test_excludes_other_users_actions(): void
    {
        $ownerShip = $this->tester->haveShip(['ownerId' => $this->ownerId]);
        $otherShip = $this->tester->haveShip(['ownerId' => $this->otherId]);

        $ownerAction = $this->insertAction($ownerShip->postId());
        $ownerAction->start();
        $this->repository->update($ownerAction);

        $otherAction = $this->insertAction($otherShip->postId());
        $otherAction->start();
        $this->repository->update($otherAction);

        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_actions' => [],
        ]);

        $this->assertCount(1, $response['helm_actions']['actions']);
        $this->assertSame($ownerAction->id, $response['helm_actions']['actions'][0]['id']);
    }

    public function test_cursor_filters_old_broadcasts(): void
    {
        $ship   = $this->tester->haveShip(['ownerId' => $this->ownerId]);
        $action = $this->insertAction($ship->postId());

        // Set broadcast_at to 2 minutes ago
        $action->start();
        $this->repository->update($action);
        $this->setBroadcastAt($action->id, Date::subSeconds(Date::now(), 120));

        wp_set_current_user($this->ownerId);

        // Since = 60 seconds ago should NOT include the 2-minute-old broadcast
        $since = Date::subSeconds(Date::now(), 60)->format('c');

        $response = $this->heartbeat->handle([], [
            'helm_actions' => ['since' => $since],
        ]);

        $this->assertSame([], $response['helm_actions']['actions']);
    }

    public function test_cursor_includes_recent_broadcasts(): void
    {
        $ship   = $this->tester->haveShip(['ownerId' => $this->ownerId]);
        $action = $this->insertAction($ship->postId());

        $action->start();
        $this->repository->update($action);

        wp_set_current_user($this->ownerId);

        // Since = 60 seconds ago should include the just-broadcast action
        $since = Date::subSeconds(Date::now(), 60)->format('c');

        $response = $this->heartbeat->handle([], [
            'helm_actions' => ['since' => $since],
        ]);

        $this->assertCount(1, $response['helm_actions']['actions']);
    }

    public function test_initial_heartbeat_defaults_to_30_seconds(): void
    {
        $ship   = $this->tester->haveShip(['ownerId' => $this->ownerId]);
        $action = $this->insertAction($ship->postId());

        // Set broadcast_at to 60 seconds ago — outside default 30s window
        $action->start();
        $this->repository->update($action);
        $this->setBroadcastAt($action->id, Date::subSeconds(Date::now(), 60));

        wp_set_current_user($this->ownerId);

        // No `since` — server defaults to 30s ago
        $response = $this->heartbeat->handle([], [
            'helm_actions' => [],
        ]);

        $this->assertSame([], $response['helm_actions']['actions']);
    }

    public function test_response_includes_server_time(): void
    {
        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_actions' => [],
        ]);

        $this->assertArrayHasKey('server_time', $response['helm_actions']);

        // server_time should be a valid ISO 8601 string
        $parsed = \DateTimeImmutable::createFromFormat(\DateTimeInterface::ATOM, $response['helm_actions']['server_time']);
        $this->assertNotFalse($parsed);
    }

    public function test_preserves_existing_response_data(): void
    {
        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle(
            ['wp_autosave' => ['success' => true]],
            ['helm_actions' => []],
        );

        $this->assertArrayHasKey('wp_autosave', $response);
        $this->assertArrayHasKey('helm_actions', $response);
    }

    public function test_action_response_contains_expected_fields(): void
    {
        $ship   = $this->tester->haveShip(['ownerId' => $this->ownerId]);
        $action = $this->insertAction($ship->postId());

        $action->start();
        $this->repository->update($action);

        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_actions' => [],
        ]);

        $this->assertCount(1, $response['helm_actions']['actions']);

        $expected = [
            'id',
            'ship_post_id',
            'type',
            'status',
            'params',
            'result',
            'deferred_until',
            'created_at',
            'updated_at',
        ];

        foreach ($expected as $key) {
            $this->assertArrayHasKey($key, $response['helm_actions']['actions'][0], "Missing key: {$key}");
        }
    }

    public function test_pending_actions_without_broadcast_are_excluded(): void
    {
        $ship = $this->tester->haveShip(['ownerId' => $this->ownerId]);

        // Insert but don't start — broadcast_at stays null
        $this->insertAction($ship->postId());

        wp_set_current_user($this->ownerId);

        $response = $this->heartbeat->handle([], [
            'helm_actions' => [],
        ]);

        $this->assertSame([], $response['helm_actions']['actions']);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function insertAction(int $shipPostId): Action
    {
        $action = new Action([
            'ship_post_id' => $shipPostId,
            'type'         => ActionType::ScanRoute,
            'params'       => ['target_node_id' => 1],
        ]);

        $this->repository->insert($action);

        return $action;
    }

    private function setBroadcastAt(int $actionId, \DateTimeImmutable $time): void
    {
        global $wpdb;

        $table = $wpdb->prefix . 'helm_ship_actions';
        $wpdb->update(
            $table,
            ['broadcast_at' => Date::toString($time)],
            ['id' => $actionId],
        );
    }
}
