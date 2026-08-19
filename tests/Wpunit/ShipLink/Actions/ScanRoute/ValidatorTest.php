<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\Core\ErrorCode;
use Helm\Navigation\NavigationService;
use Helm\ShipLink\ActionException;
use Helm\ShipLink\Actions\ScanRoute\Validator;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Validator
 *
 * @property WpunitTester $tester
 */
class ValidatorTest extends WPTestCase
{
    private Validator $validator;
    private ShipFactory $shipFactory;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->validator = new Validator(helm(NavigationService::class));
        $this->shipFactory = helm(ShipFactory::class);
    }

    public function test_throws_when_target_node_missing(): void
    {
        $shipPost = $this->tester->haveShip();
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
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
            'type' => ActionType::ScanRoute,
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
        $star = $this->tester->haveStar(['id' => 'SCAN_AT_TARGET', 'distanceLy' => 0.0]);
        $node = $this->tester->getNodeForStar($star);

        $shipPost = $this->tester->haveShip(['node_id' => $node->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node->id],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationAlreadyAtTarget, $e->errorCode);
        }
    }

    public function test_throws_when_target_node_does_not_exist(): void
    {
        $star = $this->tester->haveStar(['id' => 'SCAN_REAL_FROM', 'distanceLy' => 0.0]);
        $node = $this->tester->getNodeForStar($star);

        $shipPost = $this->tester->haveShip(['node_id' => $node->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => 999999],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationInvalidTarget, $e->errorCode);
        }
    }

    public function test_throws_when_target_beyond_scan_range(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'RANGE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'RANGE_TO', 'distanceLy' => 1000.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
        ]);

        try {
            $this->validator->validate($action, $ship);
            $this->fail('Expected ActionException was not thrown');
        } catch (ActionException $e) {
            $this->assertSame(ErrorCode::NavigationBeyondRange, $e->errorCode);
        }
    }

    public function test_passes_and_captures_from_node_when_valid(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'SCAN_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'SCAN_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
        ]);

        $this->validator->validate($action, $ship);

        $this->assertSame($node1->id, $action->params['from_node_id']);
    }
}
