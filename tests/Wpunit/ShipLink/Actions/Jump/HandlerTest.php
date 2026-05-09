<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\Jump;

use DateTimeImmutable;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\ShipLink\Actions\Jump\Handler;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\Jump\Handler
 *
 * @property WpunitTester $tester
 */
class HandlerTest extends WPTestCase
{
    private Handler $handler;
    private ShipFactory $shipFactory;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        Date::setTestNow(null);
        $this->tester->haveOrigin();

        $this->handler = new Handler();
        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function _after(): void
    {
        Date::setTestNow(null);
        parent::_after();
    }

    public function test_sets_pending_status(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'JUMP_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'JUMP_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);

        $this->handler->handle($action, $ship);

        $this->assertSame(ActionStatus::Pending, $action->status);
    }

    public function test_sets_deferred_until_in_future(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'DEFER_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'DEFER_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);

        $before = new DateTimeImmutable();
        $this->handler->handle($action, $ship);

        $this->assertNotNull($action->deferred_until);
        $this->assertGreaterThan($before, $action->deferred_until);
    }

    public function test_does_not_prebuild_result(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'CALC_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'CALC_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);

        $this->handler->handle($action, $ship);

        $this->assertNull($action->result);
    }

    public function test_longer_distance_means_longer_duration(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'DIST_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'DIST_NEAR', 'distanceLy' => 2.0]);
        $star3 = $this->tester->haveStar(['id' => 'DIST_FAR', 'distanceLy' => 10.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 2.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);
        $edgeFar = $this->edgeRepository->create($node1->id, $node3->id, 10.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edgeFar->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        // Short jump
        $shortAction = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);
        $this->handler->handle($shortAction, $ship);

        // Long jump
        $longAction = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node3->id, 'route' => [$edgeFar->id]],
        ]);
        $this->handler->handle($longAction, $ship);

        $this->assertGreaterThan(
            $shortAction->deferred_until,
            $longAction->deferred_until,
            'Longer distance should result in later completion time'
        );
    }

    public function test_route_action_waits_for_first_leg_without_prebuilding_result(): void
    {
        Date::setTestNow('2026-04-01 00:00:00');

        $star1 = $this->tester->haveStar(['id' => 'ROUTE_CALC_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'ROUTE_CALC_MID', 'distanceLy' => 3.0]);
        $star3 = $this->tester->haveStar(['id' => 'ROUTE_CALC_TO', 'distanceLy' => 7.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 3.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);
        $edge2 = $this->edgeRepository->create($node2->id, $node3->id, 4.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge2->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $directFirstLeg = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);
        $this->handler->handle($directFirstLeg, $ship);

        $routeAction = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node1->id,
                'target_node_id' => $node3->id,
                'route' => [$edge->id, $edge2->id],
            ],
        ]);
        $this->handler->handle($routeAction, $ship);

        $this->assertSame(ActionStatus::Pending, $routeAction->status);
        $this->assertNull($routeAction->result);
        $this->assertEquals($directFirstLeg->deferred_until, $routeAction->deferred_until);
    }
}
