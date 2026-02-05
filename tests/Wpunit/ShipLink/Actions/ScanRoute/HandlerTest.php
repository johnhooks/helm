<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use DateTimeImmutable;
use Helm\Navigation\NodeRepository;
use Helm\ShipLink\Actions\ScanRoute\Handler;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Handler
 *
 * @property WpunitTester $tester
 */
class HandlerTest extends WPTestCase
{
    private Handler $handler;
    private ShipFactory $shipFactory;
    private NodeRepository $nodeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->handler = new Handler();
        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
    }

    public function test_sets_pending_status(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'SCAN_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'SCAN_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
        ]);

        $this->handler->handle($action, $ship);

        $this->assertSame(ActionStatus::Pending, $action->status);
    }

    public function test_sets_deferred_until_in_future(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'DEFER_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'DEFER_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
        ]);

        $before = new DateTimeImmutable();
        $this->handler->handle($action, $ship);

        $this->assertNotNull($action->deferred_until);
        $this->assertGreaterThan($before, $action->deferred_until);
    }

    public function test_base_duration_is_approximately_one_hour(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'TIME_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'TIME_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
        ]);

        $before = new DateTimeImmutable();
        $this->handler->handle($action, $ship);

        // With default efficiency of 1.0, scan should take ~1 hour (3600 seconds)
        // Allow some variance for efficiency calculations
        $durationSeconds = $action->deferred_until->getTimestamp() - $before->getTimestamp();

        $this->assertGreaterThan(1800, $durationSeconds, 'Scan should take at least 30 minutes');
        $this->assertLessThanOrEqual(7200, $durationSeconds, 'Scan should take at most 2 hours');
    }

    public function test_stores_calculated_values_in_result(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'CALC_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'CALC_TO', 'distanceLy' => 5.0]);

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
        ]);

        $this->handler->handle($action, $ship);

        $this->assertNotNull($action->result);
        $this->assertArrayHasKey('from_node_id', $action->result);
        $this->assertArrayHasKey('to_node_id', $action->result);
        $this->assertArrayHasKey('skill', $action->result);
        $this->assertArrayHasKey('efficiency', $action->result);
        $this->assertArrayHasKey('duration', $action->result);

        $this->assertSame($node1->id, $action->result['from_node_id']);
        $this->assertSame($node2->id, $action->result['to_node_id']);
    }
}
