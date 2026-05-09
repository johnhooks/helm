<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\Core\ErrorCode;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\ActionResolver;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Contracts\ShipStateRepository;
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
    private ShipStateRepository $stateRepository;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        Date::setTestNow(null);

        $this->tester->haveOrigin();

        $this->resolver = helm(ActionResolver::class);
        $this->actionRepository = helm(ActionRepository::class);
        $this->stateRepository = helm(ShipStateRepository::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function _after(): void
    {
        Date::setTestNow(null);
        parent::_after();
    }

    private function claimForResolve(Action $action): void
    {
        $this->assertTrue($this->actionRepository->claim($action->id));
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

    public function test_claim_rejects_action_that_is_not_ready(): void
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

        $this->assertFalse($this->actionRepository->claim($action->id));
    }

    public function test_resolves_pre_claimed_running_action(): void
    {
        // Create environment for a valid jump
        $star1 = $this->tester->haveStar(['id' => 'PRECLAIM_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'PRECLAIM_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000,
        ]);

        // Create action that's already Running (pre-claimed by ActionProcessor)
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);
        $this->actionRepository->insert($action);

        $action->start();
        $this->actionRepository->update($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);

        // Running actions are resolved after ActionProcessor/repository claim.
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

    public function test_successfully_resolves_claimed_action(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RESOLVE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RESOLVE_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000,
            'current_action_id' => null,
        ]);

        // Create a ready action, then claim it before handing it to the resolver.
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);
        $this->actionRepository->insert($action);

        // Set current action on ship
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);
        $this->claimForResolve($action);

        $result = $this->resolver->resolve($action->id);

        $this->assertInstanceOf(Action::class, $result);
        $this->assertSame(ActionStatus::Fulfilled, $result->status);
    }

    public function test_clears_current_action_after_success(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'CLEAR_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'CLEAR_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000,
        ]);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);
        $this->actionRepository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);
        $this->claimForResolve($action);

        $this->resolver->resolve($action->id);

        $state = $this->stateRepository->find($ship->postId());
        $this->assertNull($state->current_action_id);
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
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);
        $this->claimForResolve($action);

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
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);
        $this->claimForResolve($action);

        try {
            $this->resolver->resolve($action->id);
        } catch (ActionException $e) {
            // Expected
        }

        $state = $this->stateRepository->find($ship->postId());
        $this->assertNull($state->current_action_id);
    }

    public function test_stores_result_data_on_success(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RESULT_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RESULT_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000,
        ]);

        // In production, Handler pre-populates result. Simulate that here.
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);
        $this->actionRepository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);
        $this->claimForResolve($action);

        $this->resolver->resolve($action->id);

        $fromDb = $this->actionRepository->find($action->id);
        $this->assertNotNull($fromDb->result);
        $this->assertArrayHasKey('phases', $fromDb->result);
        $this->assertArrayHasKey('remaining_core_life', $fromDb->result);
        $this->assertArrayHasKey('core_before', $fromDb->result);
    }

    public function test_applies_resolver_side_effects(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'EFFECTS_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'EFFECTS_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000,
        ]);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);
        $this->actionRepository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);
        $this->claimForResolve($action);

        $this->resolver->resolve($action->id);

        // Ship should have moved to target node
        $state = $this->stateRepository->find($ship->postId());
        $this->assertSame($node2->id, $state->node_id);
    }

    public function test_route_jump_runs_across_claimed_phases(): void
    {
        Date::setTestNow('2026-04-01 00:00:00');

        $star1 = $this->tester->haveStar(['id' => 'ROUTE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'ROUTE_MID', 'distanceLy' => 3.0]);
        $star3 = $this->tester->haveStar(['id' => 'ROUTE_TO', 'distanceLy' => 7.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $edge1 = $this->edgeRepository->create($node1->id, $node2->id, 3.0);
        $edge2 = $this->edgeRepository->create($node2->id, $node3->id, 4.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge1->id);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge2->id);

        $ship = $this->tester->haveShip([
            'node_id' => $node1->id,
            'core_life' => 1000,
        ]);
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node1->id,
                'target_node_id' => $node3->id,
                'route' => [$edge1->id, $edge2->id],
            ],
        ]);
        $this->actionRepository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);
        $this->claimForResolve($action);

        $firstPass = $this->resolver->resolve($action->id);

        $this->assertSame(ActionStatus::Running, $firstPass->status);
        $this->assertCount(1, $firstPass->result['phases']);
        $this->assertSame($edge1->id, $firstPass->params['route'][0]);
        $this->assertArrayNotHasKey('to_node_id', $firstPass->result['phases'][0]);
        $this->assertNull($firstPass->processing_at);
        $this->assertSame('2026-04-01 00:00:00', Date::toString($firstPass->broadcast_at));
        $this->assertGreaterThan(Date::now(), $firstPass->deferred_until);

        $stateAfterFirstPass = $this->stateRepository->find($ship->postId());
        $this->assertSame($action->id, $stateAfterFirstPass->current_action_id);
        $this->assertSame($node2->id, $stateAfterFirstPass->node_id);

        Date::setTestNow($firstPass->deferred_until->modify('+1 second'));
        $this->assertTrue($this->actionRepository->claim($action->id));

        $claimed = $this->actionRepository->find($action->id);
        $this->assertSame(ActionStatus::Running, $claimed->status);
        $this->assertNotNull($claimed->processing_at);

        $finalPass = $this->resolver->resolve($action->id);

        $this->assertSame(ActionStatus::Fulfilled, $finalPass->status);
        $this->assertCount(2, $finalPass->result['phases']);
        $this->assertSame($edge2->id, $finalPass->params['route'][1]);
        $this->assertArrayNotHasKey('to_node_id', $finalPass->result['phases'][1]);

        $stateAfterFinalPass = $this->stateRepository->find($ship->postId());
        $this->assertNull($stateAfterFinalPass->current_action_id);
        $this->assertSame($node3->id, $stateAfterFinalPass->node_id);
    }
}
