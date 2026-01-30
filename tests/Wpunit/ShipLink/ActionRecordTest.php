<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\Action;
use Helm\ShipLink\ActionRecord;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ActionRecord
 *
 * @property WpunitTester $tester
 */
class ActionRecordTest extends \Codeception\TestCase\WPTestCase
{

    public function test_pending_creates_record_with_defaults(): void
    {
        $record = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::Jump,
            params: ['target_node_id' => 456],
        );

        $this->assertNull($record->id);
        $this->assertSame(123, $record->shipPostId);
        $this->assertSame(ActionType::Jump, $record->type);
        $this->assertSame(['target_node_id' => 456], $record->params);
        $this->assertSame(ActionStatus::Pending, $record->status);
        $this->assertNull($record->deferredUntil);
        $this->assertNull($record->result);
        $this->assertInstanceOf(DateTimeImmutable::class, $record->createdAt);
        $this->assertInstanceOf(DateTimeImmutable::class, $record->updatedAt);
    }

    public function test_pending_with_deferred_until(): void
    {
        $deferredUntil = new DateTimeImmutable('+1 hour');

        $record = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::ScanRoute,
            params: [],
            deferredUntil: $deferredUntil,
        );

        $this->assertSame($deferredUntil, $record->deferredUntil);
    }

    public function test_from_action_creates_record(): void
    {
        $action = Action::jump(targetNodeId: 789);

        $record = ActionRecord::fromAction(shipPostId: 123, action: $action);

        $this->assertSame(123, $record->shipPostId);
        $this->assertSame(ActionType::Jump, $record->type);
        $this->assertSame(['target_node_id' => 789], $record->params);
        $this->assertSame(ActionStatus::Pending, $record->status);
    }

    public function test_from_row_parses_database_row(): void
    {
        $row = [
            'id' => '42',
            'ship_post_id' => '123',
            'action_type' => 'jump',
            'params' => '{"target_node_id":456}',
            'status' => 'running',
            'deferred_until' => '2025-01-15 10:00:00',
            'result' => null,
            'created_at' => '2025-01-15 09:00:00',
            'updated_at' => '2025-01-15 09:30:00',
        ];

        $record = ActionRecord::fromRow($row);

        $this->assertSame(42, $record->id);
        $this->assertSame(123, $record->shipPostId);
        $this->assertSame(ActionType::Jump, $record->type);
        $this->assertSame(['target_node_id' => 456], $record->params);
        $this->assertSame(ActionStatus::Running, $record->status);
        $this->assertSame('2025-01-15 10:00:00', $record->deferredUntil->format('Y-m-d H:i:s'));
    }

    public function test_from_row_with_result(): void
    {
        $row = [
            'id' => '42',
            'ship_post_id' => '123',
            'action_type' => 'jump',
            'params' => '{}',
            'status' => 'fulfilled',
            'deferred_until' => null,
            'result' => '{"core_used":5.5,"duration":120}',
            'created_at' => '2025-01-15 09:00:00',
            'updated_at' => '2025-01-15 09:30:00',
        ];

        $record = ActionRecord::fromRow($row);

        $this->assertSame(ActionStatus::Fulfilled, $record->status);
        $this->assertSame(['core_used' => 5.5, 'duration' => 120], $record->result);
    }

    public function test_to_row_converts_to_database_format(): void
    {
        $now = new DateTimeImmutable('2025-01-15 10:00:00');
        $deferredUntil = new DateTimeImmutable('2025-01-15 12:00:00');

        $record = new ActionRecord(
            id: 42,
            shipPostId: 123,
            type: ActionType::ScanRoute,
            params: ['target_node_id' => 456, 'depth' => 1],
            status: ActionStatus::Pending,
            deferredUntil: $deferredUntil,
            result: null,
            createdAt: $now,
            updatedAt: $now,
        );

        $row = $record->toRow();

        $this->assertSame(42, $row['id']);
        $this->assertSame(123, $row['ship_post_id']);
        $this->assertSame('scan_route', $row['action_type']);
        $this->assertSame('{"target_node_id":456,"depth":1}', $row['params']);
        $this->assertSame('pending', $row['status']);
        $this->assertSame('2025-01-15 12:00:00', $row['deferred_until']);
        $this->assertNull($row['result']);
    }

    public function test_to_row_without_id(): void
    {
        $record = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::Jump,
        );

        $row = $record->toRow();

        $this->assertArrayNotHasKey('id', $row);
    }

    public function test_with_status_creates_copy(): void
    {
        $original = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::Jump,
        );

        $updated = $original->withStatus(ActionStatus::Fulfilled, ['success' => true]);

        // Original unchanged
        $this->assertSame(ActionStatus::Pending, $original->status);
        $this->assertNull($original->result);

        // Updated has new values
        $this->assertSame(ActionStatus::Fulfilled, $updated->status);
        $this->assertSame(['success' => true], $updated->result);

        // Other fields preserved
        $this->assertSame($original->shipPostId, $updated->shipPostId);
        $this->assertSame($original->type, $updated->type);
        $this->assertSame($original->params, $updated->params);
    }

    public function test_to_action_creates_action_object(): void
    {
        $record = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::Jump,
            params: ['target_node_id' => 456],
        );

        $action = $record->toAction();

        $this->assertSame(ActionType::Jump, $action->type);
        $this->assertSame(['target_node_id' => 456], $action->params);
    }

    public function test_is_ready_when_pending_no_deferral(): void
    {
        $record = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::Jump,
        );

        $this->assertTrue($record->isReady());
    }

    public function test_is_ready_false_when_not_pending(): void
    {
        $record = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::Jump,
        )->withStatus(ActionStatus::Running);

        $this->assertFalse($record->isReady());
    }

    public function test_is_ready_false_when_deferred_in_future(): void
    {
        $futureTime = new DateTimeImmutable('+1 hour');

        $record = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::Jump,
            deferredUntil: $futureTime,
        );

        $now = new DateTimeImmutable();
        $this->assertFalse($record->isReady($now));
    }

    public function test_is_ready_true_when_deferral_passed(): void
    {
        $pastTime = new DateTimeImmutable('-1 hour');

        $record = ActionRecord::pending(
            shipPostId: 123,
            type: ActionType::Jump,
            deferredUntil: $pastTime,
        );

        $now = new DateTimeImmutable();
        $this->assertTrue($record->isReady($now));
    }
}
