<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\Core\ErrorCode;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NodeRepository;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionFactory;
use Helm\ShipLink\ActionRepository;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipSystemsRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ActionFactory
 *
 * @property WpunitTester $tester
 */
class ActionFactoryTest extends WPTestCase
{
    private ActionFactory $factory;
    private ActionRepository $actionRepository;
    private ShipSystemsRepository $systemsRepository;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();

        $this->tester->haveOrigin();

        $this->factory = helm(ActionFactory::class);
        $this->actionRepository = helm(ActionRepository::class);
        $this->systemsRepository = helm(ShipSystemsRepository::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function test_throws_when_action_type_has_no_creator(): void
    {
        $ship = $this->tester->haveShip();

        // Survey has no creator class
        try {
            $this->factory->create($ship->postId(), ActionType::Survey, []);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ActionNoHandler, $e->errorCode);
        }
    }

    public function test_creates_deferred_action_record(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'FACTORY_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'FACTORY_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000.0]);

        $action = $this->factory->create($ship->postId(), ActionType::Jump, [
            'target_node_id' => $node2->id,
        ]);

        $this->assertInstanceOf(Action::class, $action);
        $this->assertSame($ship->postId(), $action->ship_post_id);
        $this->assertSame(ActionType::Jump, $action->type);
        $this->assertSame(ActionStatus::Pending, $action->status);
        $this->assertNotNull($action->deferred_until);
    }

    public function test_persists_action_to_database(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'PERSIST_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'PERSIST_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000.0]);

        $action = $this->factory->create($ship->postId(), ActionType::Jump, [
            'target_node_id' => $node2->id,
        ]);

        $fromDb = $this->actionRepository->find($action->id);

        $this->assertNotNull($fromDb);
        $this->assertSame($action->id, $fromDb->id);
        $this->assertSame($ship->postId(), $fromDb->ship_post_id);
    }

    public function test_sets_current_action_on_ship(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'CURRENT_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'CURRENT_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000.0]);

        $action = $this->factory->create($ship->postId(), ActionType::Jump, [
            'target_node_id' => $node2->id,
        ]);

        $systems = $this->systemsRepository->find($ship->postId());

        $this->assertSame($action->id, $systems->current_action_id);
    }

    public function test_throws_when_ship_has_current_action(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'BUSY_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'BUSY_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        // Ship already has a current action
        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000.0,
            'current_action_id' => 999,
        ]);

        try {
            $this->factory->create($ship->postId(), ActionType::Jump, [
                'target_node_id' => $node2->id,
            ]);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ActionInProgress, $e->errorCode);
        }
    }

    public function test_propagates_creator_exceptions(): void
    {
        $ship = $this->tester->haveShip();

        // Jump without target_node_id - creator will throw
        try {
            $this->factory->create($ship->postId(), ActionType::Jump, []);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationMissingTarget, $e->errorCode);
        }
    }

    public function test_rollback_leaves_ship_clean_on_failure(): void
    {
        $ship = $this->tester->haveShip(['node_id' => null]);

        // Ship has no position, creator will throw
        try {
            $this->factory->create($ship->postId(), ActionType::Jump, ['target_node_id' => 1]);
        } catch (ActionException $e) {
            // Expected
        }

        // Ship should have no current action
        $systems = $this->systemsRepository->find($ship->postId());
        $this->assertNull($systems->current_action_id);

        // No action records should exist for this ship
        $actions = $this->actionRepository->findForShip($ship->postId());
        $this->assertEmpty($actions);
    }

    public function test_deferred_action_stored_in_db_for_cron_processing(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'CRON_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'CRON_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000.0]);

        $action = $this->factory->create($ship->postId(), ActionType::Jump, [
            'target_node_id' => $node2->id,
        ]);

        // Action should be stored with deferred_until set
        $this->assertNotNull($action->deferred_until);
        $this->assertSame(ActionStatus::Pending, $action->status);

        // Action should exist in DB for cron to pick up
        $fromDb = $this->actionRepository->find($action->id);
        $this->assertNotNull($fromDb);
        $this->assertNotNull($fromDb->deferred_until);

        // No per-action AS job should be scheduled (cron handles all actions)
        $scheduled = as_get_scheduled_actions([
            'hook' => 'helm_action_jump',
            'args' => ['action_id' => $action->id],
            'status' => \ActionScheduler_Store::STATUS_PENDING,
        ]);

        $this->assertCount(0, $scheduled);
    }
}
