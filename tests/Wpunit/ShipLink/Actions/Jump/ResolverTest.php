<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\Jump;

use DateTimeImmutable;
use Helm\Core\ErrorCode;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\ShipLink\Actions\Jump\Resolver;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\Jump\Resolver
 *
 * @property WpunitTester $tester
 */
class ResolverTest extends WPTestCase
{
    private Resolver $resolver;
    private ShipFactory $shipFactory;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        Date::setTestNow(null);
        $this->tester->haveOrigin();

        $this->resolver = new Resolver();
        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function _after(): void
    {
        Date::setTestNow(null);
        parent::_after();
    }

    public function test_updates_result_with_final_values(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RES_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RES_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $initialCore = 1000;
        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => $initialCore]);
        $ship = $this->shipFactory->build($shipPost->postId());
        $coreCost = $ship->propulsion()->calculateCoreCost(5.0);

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);

        $this->resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertCount(1, $action->result['phases']);
        $this->assertSame($coreCost, $action->result['phases'][0]['core_cost']);
        $this->assertArrayHasKey('remaining_core_life', $action->result);
        $this->assertArrayHasKey('core_before', $action->result);
        $this->assertSame($initialCore - (int) ceil($coreCost), $action->result['remaining_core_life']);
        $this->assertSame($initialCore, $action->result['core_before']);
    }

    public function test_resolver_throws_when_core_life_is_insufficient(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'ZERO_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'ZERO_TO', 'distanceLy' => 50.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 50.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        // Ship has less core than the cost
        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 10]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);

        try {
            $this->resolver->handle($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ShipInsufficientCore, $e->errorCode);
            $this->assertSame($node1->id, $ship->getState()->node_id);
            $this->assertNull($action->result);
        }
    }

    public function test_route_resolver_completes_one_leg_and_schedules_next(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RES_ROUTE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RES_ROUTE_MID', 'distanceLy' => 3.0]);
        $star3 = $this->tester->haveStar(['id' => 'RES_ROUTE_TO', 'distanceLy' => 7.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 3.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);
        $edge2 = $this->edgeRepository->create($node2->id, $node3->id, 4.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge2->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node1->id,
                'target_node_id' => $node3->id,
                'route' => [$edge->id, $edge2->id],
            ],
        ]);

        $this->resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Running, $action->status);
        $this->assertCount(1, $action->result['phases']);
        $this->assertArrayNotHasKey('from_node_id', $action->result['phases'][0]);
        $this->assertArrayNotHasKey('to_node_id', $action->result['phases'][0]);
        $this->assertArrayNotHasKey('distance', $action->result['phases'][0]);
        $this->assertSame($node2->id, $ship->getState()->node_id);
        $this->assertNotNull($action->deferred_until);
    }

    public function test_route_resolver_schedules_next_leg_from_phase_due_time(): void
    {
        Date::setTestNow('2026-04-01 08:00:00');

        $star1 = $this->tester->haveStar(['id' => 'RES_ROUTE_LATE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RES_ROUTE_LATE_MID', 'distanceLy' => 3.0]);
        $star3 = $this->tester->haveStar(['id' => 'RES_ROUTE_LATE_TO', 'distanceLy' => 7.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 3.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);
        $edge2 = $this->edgeRepository->create($node2->id, $node3->id, 4.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge2->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000]);
        $ship = $this->shipFactory->build($shipPost->postId());
        $phaseDueAt = new DateTimeImmutable('2026-04-01 01:00:00');
        $nextDuration = $ship->propulsion()->getJumpDuration($edge2->distance);

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node1->id,
                'target_node_id' => $node3->id,
                'route' => [$edge->id, $edge2->id],
            ],
            'deferred_until' => $phaseDueAt,
        ]);

        $this->resolver->handle($action, $ship);

        $this->assertSame(
            Date::toString(Date::addSeconds($phaseDueAt, $nextDuration)),
            Date::toString($action->deferred_until)
        );
        $this->assertLessThan(Date::now(), $action->deferred_until);
    }

    public function test_route_resolver_throws_when_current_leg_core_is_insufficient(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RES_ROUTE_LOW_CORE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RES_ROUTE_LOW_CORE_TO', 'distanceLy' => 3.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 3.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node1->id,
                'target_node_id' => $node2->id,
                'route' => [$edge->id],
            ],
        ]);

        try {
            $this->resolver->handle($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ShipInsufficientCore, $e->errorCode);
            $this->assertSame($node1->id, $ship->getState()->node_id);
            $this->assertNull($action->result);
        }
    }
}
