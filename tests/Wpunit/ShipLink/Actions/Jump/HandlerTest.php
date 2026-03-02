<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\Jump;

use DateTimeImmutable;
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
        $this->tester->haveOrigin();

        $this->handler = new Handler();
        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function test_sets_pending_status(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'JUMP_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'JUMP_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
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

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);

        $before = new DateTimeImmutable();
        $this->handler->handle($action, $ship);

        $this->assertNotNull($action->deferred_until);
        $this->assertGreaterThan($before, $action->deferred_until);
    }

    public function test_stores_calculated_values_in_result(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'CALC_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'CALC_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);

        $this->handler->handle($action, $ship);

        $this->assertNotNull($action->result);
        $this->assertArrayHasKey('from_node_id', $action->result);
        $this->assertArrayHasKey('to_node_id', $action->result);
        $this->assertArrayHasKey('distance', $action->result);
        $this->assertArrayHasKey('core_cost', $action->result);
        $this->assertArrayHasKey('duration', $action->result);

        $this->assertSame($node1->id, $action->result['from_node_id']);
        $this->assertSame($node2->id, $action->result['to_node_id']);
        $this->assertSame(5.0, $action->result['distance']);
    }

    public function test_longer_distance_means_longer_duration(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'DIST_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'DIST_NEAR', 'distanceLy' => 2.0]);
        $star3 = $this->tester->haveStar(['id' => 'DIST_FAR', 'distanceLy' => 10.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $this->edgeRepository->create($node1->id, $node2->id, 2.0);
        $this->edgeRepository->create($node1->id, $node3->id, 10.0);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        // Short jump
        $shortAction = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);
        $this->handler->handle($shortAction, $ship);

        // Long jump
        $longAction = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node3->id],
        ]);
        $this->handler->handle($longAction, $ship);

        $this->assertGreaterThan(
            $shortAction->deferred_until,
            $longAction->deferred_until,
            'Longer distance should result in later completion time'
        );
    }
}
