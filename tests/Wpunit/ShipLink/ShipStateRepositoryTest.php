<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\WpdbShipStateRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\WpdbShipStateRepository
 *
 * @property WpunitTester $tester
 */
class ShipStateRepositoryTest extends WPTestCase
{
    private WpdbShipStateRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = new WpdbShipStateRepository();
    }

    public function test_find_returns_null_for_nonexistent(): void
    {
        $result = $this->repository->find(99999);

        $this->assertNull($result);
    }

    public function test_insert_and_find(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $state = ShipState::defaults($postId);
        $this->repository->insert($state);

        $found = $this->repository->find($postId);

        $this->assertNotNull($found);
        $this->assertSame($postId, $found->ship_post_id);
        $this->assertSame(1, $found->node_id); // Sol default
    }

    public function test_exists_returns_correct_value(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->assertFalse($this->repository->exists($postId));

        $this->repository->insert(ShipState::defaults($postId));

        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_find_or_create_creates_when_missing(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->assertFalse($this->repository->exists($postId));

        $state = $this->repository->findOrCreate($postId);

        $this->assertNotNull($state);
        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_find_or_create_returns_existing(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $custom = ShipState::defaults($postId);
        $custom->node_id = 42;
        $this->repository->insert($custom);

        $found = $this->repository->findOrCreate($postId);

        $this->assertSame(42, $found->node_id);
    }

    public function test_update_modifies_record(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $state = ShipState::defaults($postId);
        $this->repository->insert($state);

        // Reload and modify
        $state = $this->repository->find($postId);
        $state->hull_integrity = 50.0;
        $state->node_id = 42;
        $this->repository->update($state);

        $found = $this->repository->find($postId);

        $this->assertSame(50.0, $found->hull_integrity);
        $this->assertSame(42, $found->node_id);
    }

    public function test_save_inserts_new_record(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $state = ShipState::defaults($postId);
        $result = $this->repository->save($state);

        $this->assertTrue($result);
        $this->assertTrue($this->repository->exists($postId));
    }

    public function test_save_updates_existing_record(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $state = ShipState::defaults($postId);
        $this->repository->save($state);

        // Reload to get a non-new model, then modify and save
        $state = $this->repository->find($postId);
        $state->hull_integrity = 50.0;
        $this->repository->save($state);

        $found = $this->repository->find($postId);
        $this->assertSame(50.0, $found->hull_integrity);
    }

    public function test_delete_removes_record(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->repository->insert(ShipState::defaults($postId));
        $this->assertTrue($this->repository->exists($postId));

        $result = $this->repository->delete($postId);

        $this->assertTrue($result);
        $this->assertFalse($this->repository->exists($postId));
    }

    public function test_find_at_node_returns_ships_at_location(): void
    {
        $ship1 = $this->tester->haveShipPost();
        $ship2 = $this->tester->haveShipPost();
        $ship3 = $this->tester->haveShipPost();

        $postId1 = $ship1->postId();
        $postId2 = $ship2->postId();
        $postId3 = $ship3->postId();

        // Two ships at node 10, one at node 20
        $this->insertWithNode($postId1, 10);
        $this->insertWithNode($postId2, 10);
        $this->insertWithNode($postId3, 20);

        $atNode10 = $this->repository->findAtNode(10);
        $atNode20 = $this->repository->findAtNode(20);

        $this->assertCount(2, $atNode10);
        $this->assertCount(1, $atNode20);
    }

    public function test_update_node_id(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->repository->insert(ShipState::defaults($postId));

        $this->repository->updateNodeId($postId, 42);

        $found = $this->repository->find($postId);
        $this->assertSame(42, $found->node_id);
    }

    public function test_update_current_action(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $postId = $shipPost->postId();

        $this->repository->insert(ShipState::defaults($postId));

        $this->repository->updateCurrentAction($postId, 99);

        $found = $this->repository->find($postId);
        $this->assertSame(99, $found->current_action_id);
    }

    public function test_find_with_current_action_returns_busy_ships(): void
    {
        $ship1 = $this->tester->haveShipPost();
        $ship2 = $this->tester->haveShipPost();

        $this->repository->insert(ShipState::defaults($ship1->postId()));
        $this->repository->insert(ShipState::defaults($ship2->postId()));

        // Only ship1 has an active action
        $this->repository->updateCurrentAction($ship1->postId(), 42);

        $busy = $this->repository->findWithCurrentAction();

        $this->assertCount(1, $busy);
        $this->assertSame($ship1->postId(), $busy[0]->ship_post_id);
    }

    public function test_find_for_user_returns_ship_state(): void
    {
        $userId = $this->factory()->user->create();
        $shipPost = $this->tester->haveShipPost(['ownerId' => $userId]);
        $this->repository->insert(ShipState::defaults($shipPost->postId()));

        $state = $this->repository->findForUser($userId);

        $this->assertNotNull($state);
        $this->assertSame($shipPost->postId(), $state->ship_post_id);
    }

    public function test_find_for_user_returns_null_when_no_ship(): void
    {
        $userId = $this->factory()->user->create();

        $state = $this->repository->findForUser($userId);

        $this->assertNull($state);
    }

    /**
     * Insert state with a specific node ID.
     */
    private function insertWithNode(int $postId, int $nodeId): void
    {
        $state = ShipState::defaults($postId);
        $state->node_id = $nodeId;
        $this->repository->insert($state);
    }
}
