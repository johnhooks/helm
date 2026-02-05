<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\ActionRepository;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
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

    public function test_insert_sets_id(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Test Ship']);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => 123],
        ]);

        $result = $this->repository->insert($action);

        $this->assertTrue($result);
        $this->assertIsInt($action->id);
        $this->assertGreaterThan(0, $action->id);
    }

    public function test_find_returns_inserted_record(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Finder Ship']);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => 123],
        ]);

        $this->repository->insert($action);
        $found = $this->repository->find($action->id);

        $this->assertNotNull($found);
        $this->assertSame($action->id, $found->id);
        $this->assertSame($ship->postId(), $found->ship_post_id);
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

        $this->repository->insert(new Action(['ship_post_id' => $ship1->postId(), 'type' => ActionType::Jump]));
        $this->repository->insert(new Action(['ship_post_id' => $ship1->postId(), 'type' => ActionType::ScanRoute]));
        $this->repository->insert(new Action(['ship_post_id' => $ship2->postId(), 'type' => ActionType::Jump]));

        $actions = $this->repository->findForShip($ship1->postId());

        $this->assertCount(2, $actions);
        foreach ($actions as $action) {
            $this->assertSame($ship1->postId(), $action->ship_post_id);
        }
    }

    public function test_find_for_ship_respects_limit(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Limit Ship']);

        $this->repository->insert(new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]));
        $this->repository->insert(new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::ScanRoute]));
        $this->repository->insert(new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Survey]));

        $actions = $this->repository->findForShip($ship->postId(), limit: 2);

        $this->assertCount(2, $actions);
    }

    public function test_find_current_for_ship_returns_pending(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Current Ship']);

        $this->repository->insert(new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]));

        $current = $this->repository->findCurrentForShip($ship->postId());

        $this->assertNotNull($current);
        $this->assertSame(ActionType::Jump, $current->type);
    }

    public function test_find_current_for_ship_returns_null_when_complete(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Complete Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $action->fulfill();
        $this->repository->update($action);

        $current = $this->repository->findCurrentForShip($ship->postId());

        $this->assertNull($current);
    }

    public function test_find_pending_excludes_deferred(): void
    {
        $ship1 = $this->tester->haveShip(['name' => 'Pending Ship']);
        $ship2 = $this->tester->haveShip(['name' => 'Deferred Ship']);

        $this->repository->insert(new Action(['ship_post_id' => $ship1->postId(), 'type' => ActionType::Jump]));
        $this->repository->insert(new Action([
            'ship_post_id' => $ship2->postId(),
            'type' => ActionType::ScanRoute,
            'deferred_until' => new DateTimeImmutable('+1 hour'),
        ]));

        $pending = $this->repository->findPending();

        $this->assertCount(1, $pending);
        $this->assertSame($ship1->postId(), $pending[0]->ship_post_id);
    }

    public function test_find_deferred_until_returns_ready_actions(): void
    {
        $ship1 = $this->tester->haveShip(['name' => 'Past Ship']);
        $ship2 = $this->tester->haveShip(['name' => 'Future Ship']);

        $past = new DateTimeImmutable('-1 hour');
        $future = new DateTimeImmutable('+1 hour');

        $this->repository->insert(new Action([
            'ship_post_id' => $ship1->postId(),
            'type' => ActionType::Jump,
            'deferred_until' => $past,
        ]));
        $this->repository->insert(new Action([
            'ship_post_id' => $ship2->postId(),
            'type' => ActionType::Jump,
            'deferred_until' => $future,
        ]));

        $now = new DateTimeImmutable();
        $ready = $this->repository->findDeferredUntil($now);

        $this->assertCount(1, $ready);
        $this->assertSame($ship1->postId(), $ready[0]->ship_post_id);
    }

    public function test_update_modifies_record(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Update Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $action->start();
        $this->repository->update($action);

        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Running, $found->status);
    }

    public function test_update_with_fulfill(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Fulfill Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $action->fulfill(['duration' => 120]);
        $this->repository->update($action);

        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Fulfilled, $found->status);
        $this->assertSame(['duration' => 120], $found->result);
    }

    public function test_update_with_fail(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Fail Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $action->fail(new \WP_Error('helm.test.out_of_range', 'Target out of range'));
        $this->repository->update($action);

        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Failed, $found->status);
        $this->assertArrayHasKey('error', $found->result);
        $this->assertSame('helm.test.out_of_range', $found->result['error']['code']);
    }

    public function test_delete_removes_record(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Delete Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $result = $this->repository->delete($action->id);

        $this->assertTrue($result);
        $this->assertNull($this->repository->find($action->id));
    }

    public function test_delete_for_ship_removes_all(): void
    {
        $ship1 = $this->tester->haveShip(['name' => 'Delete All Ship']);
        $ship2 = $this->tester->haveShip(['name' => 'Keep Ship']);

        $this->repository->insert(new Action(['ship_post_id' => $ship1->postId(), 'type' => ActionType::Jump]));
        $this->repository->insert(new Action(['ship_post_id' => $ship1->postId(), 'type' => ActionType::ScanRoute]));
        $this->repository->insert(new Action(['ship_post_id' => $ship2->postId(), 'type' => ActionType::Jump]));

        $count = $this->repository->deleteForShip($ship1->postId());

        $this->assertSame(2, $count);
        $this->assertCount(0, $this->repository->findForShip($ship1->postId()));
        $this->assertCount(1, $this->repository->findForShip($ship2->postId()));
    }

    public function test_count_returns_total(): void
    {
        $ship1 = $this->tester->haveShip(['name' => 'Count Ship 1']);
        $ship2 = $this->tester->haveShip(['name' => 'Count Ship 2']);

        $this->repository->insert(new Action(['ship_post_id' => $ship1->postId(), 'type' => ActionType::Jump]));
        $this->repository->insert(new Action(['ship_post_id' => $ship2->postId(), 'type' => ActionType::ScanRoute]));

        $count = $this->repository->count();

        $this->assertGreaterThanOrEqual(2, $count);
    }

    public function test_count_by_status(): void
    {
        $ship1 = $this->tester->haveShip(['name' => 'Status Ship 1']);
        $ship2 = $this->tester->haveShip(['name' => 'Status Ship 2']);

        $action1 = new Action(['ship_post_id' => $ship1->postId(), 'type' => ActionType::Jump]);
        $action2 = new Action(['ship_post_id' => $ship2->postId(), 'type' => ActionType::Jump]);

        $this->repository->insert($action1);
        $this->repository->insert($action2);

        $action1->fulfill();
        $this->repository->update($action1);

        $counts = $this->repository->countByStatus();

        $this->assertArrayHasKey('pending', $counts);
        $this->assertArrayHasKey('fulfilled', $counts);
    }

    public function test_find_by_status(): void
    {
        $ship1 = $this->tester->haveShip(['name' => 'By Status Ship 1']);
        $ship2 = $this->tester->haveShip(['name' => 'By Status Ship 2']);

        $action1 = new Action(['ship_post_id' => $ship1->postId(), 'type' => ActionType::Jump]);
        $action2 = new Action(['ship_post_id' => $ship2->postId(), 'type' => ActionType::Jump]);

        $this->repository->insert($action1);
        $this->repository->insert($action2);

        $action1->fulfill();
        $this->repository->update($action1);

        $fulfilled = $this->repository->findByStatus(ActionStatus::Fulfilled);
        $pending = $this->repository->findByStatus(ActionStatus::Pending);

        $this->assertCount(1, $fulfilled);
        $this->assertSame($action1->id, $fulfilled[0]->id);
        $this->assertGreaterThanOrEqual(1, count($pending));
    }

    public function test_find_running(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Running Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $action->start();
        $this->repository->update($action);

        $running = $this->repository->findRunning();

        $this->assertGreaterThanOrEqual(1, count($running));
        $this->assertSame($action->id, $running[0]->id);
    }

    public function test_save_inserts_new_action(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Save New Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);

        $result = $this->repository->save($action);

        $this->assertTrue($result);
        $this->assertNotNull($action->id);
    }

    public function test_save_updates_existing_action(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Save Existing Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $action->start();
        $result = $this->repository->save($action);

        $this->assertTrue($result);

        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Running, $found->status);
    }

    public function test_claim_ready_returns_pending_actions(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Claim Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $claimed = $this->repository->claimReady(10);

        $this->assertGreaterThanOrEqual(1, count($claimed));

        // Find our action in the claimed list
        $found = array_filter($claimed, fn($a) => $a->id === $action->id);
        $this->assertCount(1, $found);

        // Claimed actions should be marked as Running
        $claimedAction = reset($found);
        $this->assertSame(ActionStatus::Running, $claimedAction->status);
        $this->assertNotNull($claimedAction->processing_at);
    }

    public function test_claim_ready_skips_deferred_actions(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Claim Deferred Ship']);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'deferred_until' => new DateTimeImmutable('+1 hour'),
        ]);
        $this->repository->insert($action);

        $claimed = $this->repository->claimReady(10);

        // Our action should not be claimed
        $found = array_filter($claimed, fn($a) => $a->id === $action->id);
        $this->assertCount(0, $found);

        // Original should still be pending
        $original = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Pending, $original->status);
    }

    public function test_claim_ready_includes_past_deferred_actions(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Claim Past Deferred Ship']);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'deferred_until' => new DateTimeImmutable('-1 minute'),
        ]);
        $this->repository->insert($action);

        $claimed = $this->repository->claimReady(10);

        // Our action should be claimed
        $found = array_filter($claimed, fn($a) => $a->id === $action->id);
        $this->assertCount(1, $found);
    }

    public function test_claim_ready_respects_limit(): void
    {
        $ships = [];
        for ($i = 0; $i < 5; $i++) {
            $ships[$i] = $this->tester->haveShip(['name' => "Claim Limit Ship {$i}"]);
            $action = new Action(['ship_post_id' => $ships[$i]->postId(), 'type' => ActionType::Jump]);
            $this->repository->insert($action);
        }

        $claimed = $this->repository->claimReady(2);

        $this->assertCount(2, $claimed);
    }

    public function test_claim_ready_skips_already_running(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Claim Running Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        // Mark as running
        $action->start();
        $this->repository->update($action);

        $claimed = $this->repository->claimReady(10);

        // Our action should not be claimed again
        $found = array_filter($claimed, fn($a) => $a->id === $action->id);
        $this->assertCount(0, $found);
    }

    public function test_claim_ready_marks_actions_as_running_in_db(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Claim DB Ship']);

        $action = new Action(['ship_post_id' => $ship->postId(), 'type' => ActionType::Jump]);
        $this->repository->insert($action);

        $this->repository->claimReady(10);

        // Reload from DB to verify status persisted
        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Running, $found->status);
        $this->assertNotNull($found->processing_at);
    }

    public function test_claim_ready_returns_empty_when_no_pending(): void
    {
        // Delete all existing pending actions first
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->prefix}helm_ship_actions WHERE status = 'pending'");

        $claimed = $this->repository->claimReady(10);

        $this->assertCount(0, $claimed);
    }
}
