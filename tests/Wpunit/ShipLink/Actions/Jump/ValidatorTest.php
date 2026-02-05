<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\Jump;

use Helm\Core\ErrorCode;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NodeRepository;
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

        $this->validator = new Validator();
        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
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
            'params' => ['target_node_id' => 1],
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
        $node = $this->nodeRepository->getByStarPostId($star->postId());

        $shipPost = $this->tester->haveShip(['node_id' => $node->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node->id],
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

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationNoRoute, $e->errorCode);
        }
    }

    public function test_throws_when_insufficient_core_life(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'LOW_CORE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'LOW_CORE_TO', 'distanceLy' => 100.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 100.0);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1.0]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::ShipInsufficientCore, $e->errorCode);
        }
    }

    public function test_passes_when_valid(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'VALID_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'VALID_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id, 'core_life' => 1000.0]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);

        // Should not throw
        $this->validator->validate($action, $ship);

        // If we got here, validation passed
        $this->assertTrue(true);
    }
}
