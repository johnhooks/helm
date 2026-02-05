<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\Core\ErrorCode;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NodeRepository;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionRepository;
use Helm\ShipLink\ActionResolver;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipSystemsRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ActionResolver
 *
 * @property WpunitTester $tester
 */
class ActionResolverTest extends WPTestCase
{
    private ActionResolver $resolver;
    private ActionRepository $actionRepository;
    private ShipSystemsRepository $systemsRepository;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();

        $this->tester->haveOrigin();

        $this->resolver = helm(ActionResolver::class);
        $this->actionRepository = helm(ActionRepository::class);
        $this->systemsRepository = helm(ShipSystemsRepository::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function test_throws_when_action_not_found(): void
    {
        try {
            $this->resolver->resolve(999999);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ActionNotFound, $e->errorCode);
        }
    }

    public function test_throws_when_action_not_ready(): void
    {
        $ship = $this->tester->haveShip();

        // Create action deferred to the future
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => 1],
            'deferred_until' => new DateTimeImmutable('+1 hour'),
        ]);

        $this->actionRepository->insert($action);

        try {
            $this->resolver->resolve($action->id);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ActionNotReady, $e->errorCode);
        }
    }

    public function test_resolves_pre_claimed_running_action(): void
    {
        // Create environment for a valid jump
        $star1 = $this->tester->haveStar(['id' => 'PRECLAIM_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'PRECLAIM_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);

        // Create action that's already Running (pre-claimed by ActionProcessor)
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);
        $this->actionRepository->insert($action);

        $action->start();
        $this->actionRepository->update($action);
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

        // Running actions are now resolved directly (skipping claim step)
        $result = $this->resolver->resolve($action->id);

        $this->assertSame(ActionStatus::Fulfilled, $result->status);
    }

    public function test_throws_when_action_already_complete(): void
    {
        $ship = $this->tester->haveShip();

        // Create action that's already fulfilled (terminal state)
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => 1],
        ]);
        $this->actionRepository->insert($action);

        $action->fulfill();
        $this->actionRepository->update($action);

        try {
            $this->resolver->resolve($action->id);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            // Completed actions should fail with ActionNotReady
            $this->assertSame(ErrorCode::ActionNotReady, $e->errorCode);
        }
    }

    public function test_successfully_resolves_pending_action(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RESOLVE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RESOLVE_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000.0,
            'current_action_id' => null,
        ]);

        // Create a pending action that's ready (no deferred_until or in the past)
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);
        $this->actionRepository->insert($action);

        // Set current action on ship
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

        $result = $this->resolver->resolve($action->id);

        $this->assertInstanceOf(Action::class, $result);
        $this->assertSame(ActionStatus::Fulfilled, $result->status);
    }

    public function test_clears_current_action_after_success(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'CLEAR_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'CLEAR_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);
        $this->actionRepository->insert($action);
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

        $this->resolver->resolve($action->id);

        $systems = $this->systemsRepository->find($ship->postId());
        $this->assertNull($systems->current_action_id);
    }

    public function test_marks_action_failed_when_no_resolver(): void
    {
        $ship = $this->tester->haveShip();

        // Survey action has no resolver class yet
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Survey,
            'params' => [],
        ]);
        $this->actionRepository->insert($action);
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

        try {
            $this->resolver->resolve($action->id);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ActionNoResolver, $e->errorCode);
        }

        $fromDb = $this->actionRepository->find($action->id);
        $this->assertSame(ActionStatus::Failed, $fromDb->status);
        $this->assertArrayHasKey('error', $fromDb->result);
        $this->assertSame('helm.action.no_resolver', $fromDb->result['error']['code']);
    }

    public function test_clears_current_action_after_failure(): void
    {
        $ship = $this->tester->haveShip();

        // Survey action has no resolver class yet - will fail
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Survey,
            'params' => [],
        ]);
        $this->actionRepository->insert($action);
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

        try {
            $this->resolver->resolve($action->id);
        } catch (ActionException $e) {
            // Expected
        }

        $systems = $this->systemsRepository->find($ship->postId());
        $this->assertNull($systems->current_action_id);
    }

    public function test_stores_result_data_on_success(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RESULT_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RESULT_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);

        // In production, Handler pre-populates result. Simulate that here.
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'distance' => 5.0,
                'core_cost' => 5.0,
                'duration' => 300,
            ],
        ]);
        $this->actionRepository->insert($action);
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

        $this->resolver->resolve($action->id);

        $fromDb = $this->actionRepository->find($action->id);
        $this->assertNotNull($fromDb->result);
        // Original Handler data preserved
        $this->assertArrayHasKey('from_node_id', $fromDb->result);
        $this->assertArrayHasKey('to_node_id', $fromDb->result);
        // Resolver adds execution data
        $this->assertArrayHasKey('remaining_core_life', $fromDb->result);
        $this->assertArrayHasKey('core_before', $fromDb->result);
    }

    public function test_applies_resolver_side_effects(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'EFFECTS_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'EFFECTS_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);
        $this->actionRepository->insert($action);
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

        $this->resolver->resolve($action->id);

        // Ship should have moved to target node
        $systems = $this->systemsRepository->find($ship->postId());
        $this->assertSame($node2->id, $systems->node_id);
    }
}
