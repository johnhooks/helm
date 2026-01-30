<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\ActionRecord;
use Helm\ShipLink\ActionRepository;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ActionRepository
 *
 * @property WpunitTester $tester
 */
class ActionRepositoryTest extends \Codeception\TestCase\WPTestCase
{
    private ActionRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();
        
        $this->repository = new ActionRepository();
    }

    public function test_insert_returns_id(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Test Ship']);
        
        $record = ActionRecord::pending(
            shipPostId: $ship->postId(),
            type: ActionType::Jump,
            params: ['target_node_id' => 123],
        );

        $id = $this->repository->insert($record);

        $this->assertIsInt($id);
        $this->assertGreaterThan(0, $id);
    }

    public function test_find_returns_inserted_record(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Finder Ship']);
        
        $record = ActionRecord::pending(
            shipPostId: $ship->postId(),
            type: ActionType::Jump,
            params: ['target_node_id' => 123],
        );

        $id = $this->repository->insert($record);
        $found = $this->repository->find($id);

        $this->assertNotNull($found);
        $this->assertSame($id, $found->id);
        $this->assertSame($ship->postId(), $found->shipPostId);
        $this->assertSame(ActionType::Jump, $found->type);
        $this->assertSame(['target_node_id' => 123], $found->params);
        $this->assertSame(ActionStatus::Pending, $found->status);
    }

    public function test_find_returns_null_for_nonexistent(): void
    {
        $found = $this->repository->find(999999);

        $this->assertNull($found);
    }

    public function test_find_for_ship_returns_all_actions(): void
    {
        $ship1 = $this->tester->haveShip(['name' => 'Ship One']);
        $ship2 = $this->tester->haveShip(['name' => 'Ship Two']);
        
        $this->repository->insert(ActionRecord::pending($ship1->postId(), ActionType::Jump));
        $this->repository->insert(ActionRecord::pending($ship1->postId(), ActionType::ScanRoute));
        $this->repository->insert(ActionRecord::pending($ship2->postId(), ActionType::Jump)); // Different ship

        $actions = $this->repository->findForShip($ship1->postId());

        $this->assertCount(2, $actions);
        foreach ($actions as $action) {
            $this->assertSame($ship1->postId(), $action->shipPostId);
        }
    }

    public function test_find_for_ship_respects_limit(): void
    {
        $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $this->repository->insert(ActionRecord::pending(1, ActionType::ScanRoute));
        $this->repository->insert(ActionRecord::pending(1, ActionType::Survey));

        $actions = $this->repository->findForShip(1, limit: 2);

        $this->assertCount(2, $actions);
    }

    public function test_find_current_for_ship_returns_pending(): void
    {
        $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));

        $current = $this->repository->findCurrentForShip(1);

        $this->assertNotNull($current);
        $this->assertSame(ActionType::Jump, $current->type);
    }

    public function test_find_current_for_ship_returns_null_when_complete(): void
    {
        $id = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $this->repository->markFulfilled($id);

        $current = $this->repository->findCurrentForShip(1);

        $this->assertNull($current);
    }

    public function test_find_pending_excludes_deferred(): void
    {
        $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $this->repository->insert(ActionRecord::pending(
            shipPostId: 2,
            type: ActionType::ScanRoute,
            deferredUntil: new DateTimeImmutable('+1 hour'),
        ));

        $pending = $this->repository->findPending();

        $this->assertCount(1, $pending);
        $this->assertSame(1, $pending[0]->shipPostId);
    }

    public function test_find_deferred_until_returns_ready_actions(): void
    {
        $past = new DateTimeImmutable('-1 hour');
        $future = new DateTimeImmutable('+1 hour');

        $this->repository->insert(ActionRecord::pending(1, ActionType::Jump, deferredUntil: $past));
        $this->repository->insert(ActionRecord::pending(2, ActionType::Jump, deferredUntil: $future));

        $now = new DateTimeImmutable();
        $ready = $this->repository->findDeferredUntil($now);

        $this->assertCount(1, $ready);
        $this->assertSame(1, $ready[0]->shipPostId);
    }

    public function test_update_modifies_record(): void
    {
        $id = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $record = $this->repository->find($id);

        $updated = $record->withStatus(ActionStatus::Running);
        $this->repository->update($updated);

        $found = $this->repository->find($id);
        $this->assertSame(ActionStatus::Running, $found->status);
    }

    public function test_update_status_changes_status(): void
    {
        $id = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));

        $this->repository->updateStatus($id, ActionStatus::Fulfilled, ['success' => true]);

        $found = $this->repository->find($id);
        $this->assertSame(ActionStatus::Fulfilled, $found->status);
        $this->assertSame(['success' => true], $found->result);
    }

    public function test_mark_running(): void
    {
        $id = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));

        $this->repository->markRunning($id);

        $found = $this->repository->find($id);
        $this->assertSame(ActionStatus::Running, $found->status);
    }

    public function test_mark_fulfilled(): void
    {
        $id = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));

        $this->repository->markFulfilled($id, ['duration' => 120]);

        $found = $this->repository->find($id);
        $this->assertSame(ActionStatus::Fulfilled, $found->status);
        $this->assertSame(['duration' => 120], $found->result);
    }

    public function test_mark_failed(): void
    {
        $id = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));

        $this->repository->markFailed($id, ['error' => 'out_of_range']);

        $found = $this->repository->find($id);
        $this->assertSame(ActionStatus::Failed, $found->status);
        $this->assertSame(['error' => 'out_of_range'], $found->result);
    }

    public function test_delete_removes_record(): void
    {
        $id = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));

        $result = $this->repository->delete($id);

        $this->assertTrue($result);
        $this->assertNull($this->repository->find($id));
    }

    public function test_delete_for_ship_removes_all(): void
    {
        $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $this->repository->insert(ActionRecord::pending(1, ActionType::ScanRoute));
        $this->repository->insert(ActionRecord::pending(2, ActionType::Jump));

        $count = $this->repository->deleteForShip(1);

        $this->assertSame(2, $count);
        $this->assertCount(0, $this->repository->findForShip(1));
        $this->assertCount(1, $this->repository->findForShip(2));
    }

    public function test_count_returns_total(): void
    {
        $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $this->repository->insert(ActionRecord::pending(2, ActionType::ScanRoute));

        $count = $this->repository->count();

        $this->assertGreaterThanOrEqual(2, $count);
    }

    public function test_count_by_status(): void
    {
        $id1 = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $id2 = $this->repository->insert(ActionRecord::pending(2, ActionType::Jump));
        $this->repository->markFulfilled($id1);

        $counts = $this->repository->countByStatus();

        $this->assertArrayHasKey('pending', $counts);
        $this->assertArrayHasKey('fulfilled', $counts);
    }

    public function test_find_by_status(): void
    {
        $id1 = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $id2 = $this->repository->insert(ActionRecord::pending(2, ActionType::Jump));
        $this->repository->markFulfilled($id1);

        $fulfilled = $this->repository->findByStatus(ActionStatus::Fulfilled);
        $pending = $this->repository->findByStatus(ActionStatus::Pending);

        $this->assertCount(1, $fulfilled);
        $this->assertSame($id1, $fulfilled[0]->id);
        $this->assertGreaterThanOrEqual(1, count($pending));
    }

    public function test_find_running(): void
    {
        $id = $this->repository->insert(ActionRecord::pending(1, ActionType::Jump));
        $this->repository->markRunning($id);

        $running = $this->repository->findRunning();

        $this->assertGreaterThanOrEqual(1, count($running));
        $this->assertSame($id, $running[0]->id);
    }
}
