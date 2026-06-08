<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Models\Action
 *
 * @property WpunitTester $tester
 */
class ActionTest extends \Codeception\TestCase\WPTestCase
{
    public function test_creates_with_defaults(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => 456],
        ]);

        $this->assertNull($action->id);
        $this->assertSame(123, $action->ship_post_id);
        $this->assertSame(ActionType::Jump, $action->type);
        $this->assertSame(['target_node_id' => 456], $action->params);
        $this->assertSame(ActionStatus::Pending, $action->status);
        $this->assertNull($action->deferred_until);
        $this->assertNull($action->result);
    }

    public function test_creates_with_deferred_until(): void
    {
        $deferredUntil = new DateTimeImmutable('+1 hour');

        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::ScanRoute,
            'deferred_until' => $deferredUntil,
        ]);

        $this->assertEquals($deferredUntil, $action->deferred_until);
    }

    public function test_get_returns_param_value(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => 456, 'distance' => 5.0],
        ]);

        $this->assertSame(456, $action->get('target_node_id'));
        $this->assertSame(5.0, $action->get('distance'));
    }

    public function test_get_returns_default_for_missing_param(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'params' => [],
        ]);

        $this->assertNull($action->get('missing'));
        $this->assertSame('default', $action->get('missing', 'default'));
    }

    public function test_fulfill_sets_status_and_result(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
        ]);

        $action->fulfill(['distance' => 5.0, 'core_cost' => 2.5]);

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertSame(['distance' => 5.0, 'core_cost' => 2.5], $action->result);
    }

    public function test_fulfill_without_result_keeps_existing(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'result' => ['from_node_id' => 1, 'to_node_id' => 2],
        ]);

        $action->fulfill();

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertSame(['from_node_id' => 1, 'to_node_id' => 2], $action->result);
    }

    public function test_fulfill_with_result_merges_into_existing(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'result' => ['from_node_id' => 1, 'to_node_id' => 2, 'distance' => 5.0],
        ]);

        $action->fulfill(['remaining_core_life' => 995.0, 'core_before' => 1000.0]);

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertSame([
            'from_node_id' => 1,
            'to_node_id' => 2,
            'distance' => 5.0,
            'remaining_core_life' => 995.0,
            'core_before' => 1000.0,
        ], $action->result);
    }

    public function test_fulfill_with_result_overwrites_matching_keys(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'result' => ['status' => 'pending', 'value' => 10],
        ]);

        $action->fulfill(['status' => 'complete', 'extra' => 'data']);

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertSame([
            'status' => 'complete',
            'value' => 10,
            'extra' => 'data',
        ], $action->result);
    }

    public function test_fail_sets_status_and_serializes_error(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
        ]);

        $error = new \WP_Error('helm.test.error', 'Something went wrong');
        $action->fail($error);

        $this->assertSame(ActionStatus::Failed, $action->status);
        $this->assertArrayHasKey('error', $action->result);
        $this->assertSame('helm.test.error', $action->result['error']['code']);
        $this->assertSame('Something went wrong', $action->result['error']['message']);
    }

    public function test_fail_merges_error_into_existing_result(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'result' => ['from_node_id' => 1, 'to_node_id' => 2],
        ]);

        $error = new \WP_Error('helm.test.error', 'Failed during execution');
        $action->fail($error);

        $this->assertSame(ActionStatus::Failed, $action->status);
        // Original data preserved
        $this->assertSame(1, $action->result['from_node_id']);
        $this->assertSame(2, $action->result['to_node_id']);
        // Error added
        $this->assertArrayHasKey('error', $action->result);
        $this->assertSame('helm.test.error', $action->result['error']['code']);
    }

    public function test_start_sets_running_status(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
        ]);

        $action->start();

        $this->assertSame(ActionStatus::Running, $action->status);
    }

    public function test_is_ready_when_pending_no_deferral(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
        ]);

        $this->assertTrue($action->isReady());
    }

    public function test_is_ready_false_when_not_pending(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
        ]);

        $action->start();

        $this->assertFalse($action->isReady());
    }

    public function test_is_ready_false_when_deferred_in_future(): void
    {
        $futureTime = new DateTimeImmutable('+1 hour');

        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'deferred_until' => $futureTime,
        ]);

        $now = new DateTimeImmutable();
        $this->assertFalse($action->isReady($now));
    }

    public function test_is_ready_true_when_deferral_passed(): void
    {
        $pastTime = new DateTimeImmutable('-1 hour');

        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'deferred_until' => $pastTime,
        ]);

        $now = new DateTimeImmutable();
        $this->assertTrue($action->isReady($now));
    }

    public function test_requires_time_delegates_to_type(): void
    {
        $jumpAction = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
        ]);

        $scanAction = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::ScanRoute,
        ]);

        // Jump and ScanRoute both require time based on the ActionType enum
        $this->assertSame(ActionType::Jump->requiresTime(), $jumpAction->requiresTime());
        $this->assertSame(ActionType::ScanRoute->requiresTime(), $scanAction->requiresTime());
    }

    public function test_from_data_hydrates_from_array(): void
    {
        $data = [
            'id' => 42,
            'ship_post_id' => 123,
            'type' => 'jump',
            'params' => '{"target_node_id":456}',
            'status' => 'running',
            'deferred_until' => '2025-01-15 10:00:00',
            'processing_at' => '2025-01-15 09:30:00',
            'attempts' => 1,
            'result' => null,
            'created_at' => '2025-01-15 09:00:00',
            'updated_at' => '2025-01-15 09:30:00',
        ];

        $action = Action::fromData($data);

        $this->assertSame(42, $action->id);
        $this->assertSame(123, $action->ship_post_id);
        $this->assertSame(ActionType::Jump, $action->type);
        $this->assertSame(['target_node_id' => 456], $action->params);
        $this->assertSame(ActionStatus::Running, $action->status);
        $this->assertSame('2025-01-15 10:00:00', $action->deferred_until->format('Y-m-d H:i:s'));
        $this->assertSame('2025-01-15 09:30:00', $action->processing_at->format('Y-m-d H:i:s'));
        $this->assertSame(1, $action->attempts);
    }

    public function test_from_data_with_result(): void
    {
        $data = [
            'id' => 42,
            'ship_post_id' => 123,
            'type' => 'jump',
            'params' => '{}',
            'status' => 'fulfilled',
            'deferred_until' => null,
            'processing_at' => null,
            'attempts' => 0,
            'result' => '{"core_used":5.5,"duration":120}',
            'created_at' => '2025-01-15 09:00:00',
            'updated_at' => '2025-01-15 09:30:00',
        ];

        $action = Action::fromData($data);

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertSame(['core_used' => 5.5, 'duration' => 120], $action->result);
    }

    public function test_is_set_tracks_set_properties(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
        ]);

        $this->assertTrue($action->isSet('ship_post_id'));
        $this->assertTrue($action->isSet('type'));
        $this->assertFalse($action->isSet('deferred_until'));
    }

    public function test_to_array_returns_all_properties(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => 456],
        ]);

        $array = $action->toArray();

        $this->assertArrayHasKey('ship_post_id', $array);
        $this->assertArrayHasKey('type', $array);
        $this->assertArrayHasKey('params', $array);
        $this->assertArrayHasKey('status', $array);
        $this->assertSame(123, $array['ship_post_id']);
        $this->assertSame(ActionType::Jump, $array['type']);
    }

    public function test_methods_return_self_for_chaining(): void
    {
        $action = new Action([
            'ship_post_id' => 123,
            'type' => ActionType::Jump,
        ]);

        $result = $action->start();
        $this->assertSame($action, $result);

        $action2 = new Action([
            'ship_post_id' => 456,
            'type' => ActionType::Jump,
        ]);

        $result2 = $action2->fulfill(['success' => true]);
        $this->assertSame($action2, $result2);

        $action3 = new Action([
            'ship_post_id' => 789,
            'type' => ActionType::Jump,
        ]);

        $result3 = $action3->fail(new \WP_Error('test', 'error'));
        $this->assertSame($action3, $result3);
    }
}
