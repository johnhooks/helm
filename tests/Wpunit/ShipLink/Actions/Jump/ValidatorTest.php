<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\Jump;

use Helm\Core\ErrorCode;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\Actions\Jump\Validator;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\Jump\Validator
 *
 * @property WpunitTester $tester
 */
class ValidatorTest extends WPTestCase
{
    private Validator $validator;
    private ShipFactory $shipFactory;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
        $this->validator = new Validator();
    }

    public function test_throws_when_target_node_missing(): void
    {
        $shipPost = $this->tester->haveShip();
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => [],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationMissingTarget, $e->errorCode);
        }
    }

    public function test_throws_when_ship_has_no_position(): void
    {
        $shipPost = $this->tester->haveShip(['node_id' => null]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => 1, 'target_node_id' => 2, 'route' => [1]],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ShipNoPosition, $e->errorCode);
        }
    }

    public function test_throws_when_already_at_target(): void
    {
        $star = $this->tester->haveStar(['id' => 'AT_TARGET', 'distanceLy' => 0.0]);
        $node = $this->tester->getNodeForStar($star);

        $shipPost = $this->tester->haveShip(['node_id' => $node->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node->id, 'target_node_id' => $node->id, 'route' => [1]],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationAlreadyAtTarget, $e->errorCode);
        }
    }

    public function test_throws_when_no_route_exists(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'NO_ROUTE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'NO_ROUTE_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [999999]],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationNoRoute, $e->errorCode);
        }
    }

    public function test_does_not_validate_full_route_core_life_up_front(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'LOW_CORE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'LOW_CORE_TO', 'distanceLy' => 100.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 100.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1.0]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);

        $this->validator->validate($action, $ship);

        $this->assertTrue(true);
    }

    public function test_passes_when_valid(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'VALID_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'VALID_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000.0]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);

        // Should not throw
        $this->validator->validate($action, $ship);

        // If we got here, validation passed
        $this->assertTrue(true);
    }

    public function test_passes_for_valid_route_plan(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'VALID_ROUTE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'VALID_ROUTE_MID', 'distanceLy' => 3.0]);
        $star3 = $this->tester->haveStar(['id' => 'VALID_ROUTE_TO', 'distanceLy' => 7.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $ownerId = self::factory()->user->create(['role' => 'subscriber']);
        $edge1 = $this->edgeRepository->create($node1->id, $node2->id, 3.0);
        $edge2 = $this->edgeRepository->create($node2->id, $node3->id, 4.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert($ownerId, $edge1->id);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert($ownerId, $edge2->id);

        $shipPost = $this->tester->haveShip(['ownerId' => $ownerId, 'node_id' => $node1->id, 'core_life' => 1000.0]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node1->id,
                'target_node_id' => $node3->id,
                'route' => [$edge1->id, $edge2->id],
            ],
        ]);

        $this->validator->validate($action, $ship);

        $this->assertTrue(true);
    }

    public function test_throws_when_route_plan_does_not_chain_from_current_position(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'BAD_ROUTE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'BAD_ROUTE_MID', 'distanceLy' => 3.0]);
        $star3 = $this->tester->haveStar(['id' => 'BAD_ROUTE_TO', 'distanceLy' => 7.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000.0]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node2->id,
                'target_node_id' => $node3->id,
                'route' => [999999],
            ],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationNoRoute, $e->errorCode);
        }
    }

    public function test_throws_when_route_leg_is_not_discovered_by_ship_owner(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'UNKNOWN_ROUTE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'UNKNOWN_ROUTE_TO', 'distanceLy' => 3.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 3.0);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000.0]);
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
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationNoRoute, $e->errorCode);
        }
    }

    public function test_throws_when_later_route_leg_is_not_discovered_by_ship_owner(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'UNKNOWN_LATER_ROUTE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'UNKNOWN_LATER_ROUTE_MID', 'distanceLy' => 3.0]);
        $star3 = $this->tester->haveStar(['id' => 'UNKNOWN_LATER_ROUTE_TO', 'distanceLy' => 7.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $ownerId = self::factory()->user->create(['role' => 'subscriber']);
        $knownEdge = $this->edgeRepository->create($node1->id, $node2->id, 3.0);
        $unknownEdge = $this->edgeRepository->create($node2->id, $node3->id, 4.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert($ownerId, $knownEdge->id);

        $shipPost = $this->tester->haveShip(['ownerId' => $ownerId, 'node_id' => $node1->id, 'core_life' => 1000.0]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node1->id,
                'target_node_id' => $node3->id,
                'route' => [$knownEdge->id, $unknownEdge->id],
            ],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationNoRoute, $e->errorCode);
        }
    }
}
