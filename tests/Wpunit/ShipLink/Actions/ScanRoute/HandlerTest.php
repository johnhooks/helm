<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\Lib\Date;
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

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->handler = new Handler();
        $this->shipFactory = helm(ShipFactory::class);
    }

    public function _after(): void
    {
        Date::setTestNow(null);
        parent::_after();
    }

    private function buildAction(int $shipPostId): Action
    {
        return new Action([
            'ship_post_id' => $shipPostId,
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => 2, 'from_node_id' => 1],
        ]);
    }

    public function test_sets_pending_status(): void
    {
        $shipPost = $this->tester->haveShip();
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = $this->buildAction($shipPost->postId());
        $this->handler->handle($action, $ship);

        $this->assertSame(ActionStatus::Pending, $action->status);
    }

    public function test_first_scan_cycle_is_five_minutes(): void
    {
        Date::setTestNow('2026-04-01 00:00:00');

        $shipPost = $this->tester->haveShip();
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = $this->buildAction($shipPost->postId());
        $this->handler->handle($action, $ship);

        $this->assertSame('2026-04-01 00:05:00', Date::toString($action->deferred_until));
    }

    public function test_seeds_runtime_state_with_anchors_and_empty_history(): void
    {
        Date::setTestNow('2026-04-01 00:00:00');

        $shipPost = $this->tester->haveShip();
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = $this->buildAction($shipPost->postId());
        $this->handler->handle($action, $ship);

        $this->assertNotNull($action->runtime_state);
        $this->assertSame(1, $action->runtime_state['cycle_index']);
        $this->assertSame(300, $action->runtime_state['cycle_seconds']);
        $this->assertSame('2026-04-01 00:00:00', $action->runtime_state['started_at']);
        $this->assertSame([], $action->runtime_state['cycles']);
    }

    public function test_leaves_public_result_empty(): void
    {
        $shipPost = $this->tester->haveShip();
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = $this->buildAction($shipPost->postId());
        $this->handler->handle($action, $ship);

        $this->assertNull($action->result);
    }
}
