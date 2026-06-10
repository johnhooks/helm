<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\WpdbActionRepository;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ProcessingResult;
use Helm\ShipLink\WpdbShipStateRepository;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ActionProcessor
 *
 * @property WpunitTester $tester
 */
class ActionProcessorTest extends \Codeception\TestCase\WPTestCase
{
    private WpdbActionRepository $repository;
    private ActionProcessor $processor;
    private WpdbShipStateRepository $stateRepository;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        Date::setTestNow(null);

        $this->tester->haveOrigin();

        $this->repository = new WpdbActionRepository();
        $this->stateRepository = new WpdbShipStateRepository();
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);

        // Get the processor from container (it has all dependencies wired)
        $this->processor = helm(ActionProcessor::class);
    }

    public function _after(): void
    {
        Date::setTestNow(null);
        parent::_after();
    }

    public function test_process_ready_returns_result(): void
    {
        $result = $this->processor->processReady();

        $this->assertInstanceOf(ProcessingResult::class, $result);
        $this->assertGreaterThanOrEqual(0, $result->processed);
        $this->assertGreaterThanOrEqual(0, $result->failed);
    }

    public function test_process_ready_processes_pending_action(): void
    {
        // Create stars which create nav nodes
        $star1 = $this->tester->haveStar(['id' => 'PROC_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'PROC_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        // Create edge between nodes
        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $ship = $this->tester->haveShip([
            'name' => 'Process Ship',
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);

        // Create a ready action (no deferred_until means immediately ready)
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
        ]);
        $this->repository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);

        // Process
        $result = $this->processor->processReady();

        // Verify action was processed
        $this->assertGreaterThanOrEqual(1, $result->processed);

        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Fulfilled, $found->status);
    }

    public function test_process_ready_skips_deferred_actions(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Deferred Ship']);

        // Create an action deferred to the future
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => 999],
            'deferred_until' => new DateTimeImmutable('+1 hour'),
        ]);
        $this->repository->insert($action);

        // Process
        $result = $this->processor->processReady();

        // Verify action was NOT processed (still pending)
        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Pending, $found->status);
    }

    public function test_process_ready_processes_past_deferred_actions(): void
    {
        // Create stars which create nav nodes
        $star1 = $this->tester->haveStar(['id' => 'PAST_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'PAST_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

        $ship = $this->tester->haveShip([
            'name' => 'Past Deferred Ship',
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);

        // Create an action that was deferred but is now ready
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
            'deferred_until' => new DateTimeImmutable('-1 minute'),
        ]);
        $this->repository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);

        // Process
        $result = $this->processor->processReady();

        // Verify action was processed
        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Fulfilled, $found->status);
    }

    public function test_process_ready_respects_limit(): void
    {
        $stars = [];
        for ($i = 0; $i < 3; $i++) {
            $star1 = $this->tester->haveStar(['id' => "LIMIT_FROM_{$i}", 'distanceLy' => 0.0]);
            $star2 = $this->tester->haveStar(['id' => "LIMIT_TO_{$i}", 'distanceLy' => 5.0]);

            $node1 = $this->tester->getNodeForStar($star1);
            $node2 = $this->tester->getNodeForStar($star2);

            $edge = $this->edgeRepository->create($node1->id, $node2->id, 5.0);
            helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);

            $ship = $this->tester->haveShip([
                'name' => "Limit Ship {$i}",
                'node_id' => $node1->id,
                'core_life' => 1000.0,
            ]);

            $action = new Action([
                'ship_post_id' => $ship->postId(),
                'type' => ActionType::Jump,
                'params' => ['from_node_id' => $node1->id, 'target_node_id' => $node2->id, 'route' => [$edge->id]],
            ]);
            $this->repository->insert($action);
            $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);
        }

        // Process with limit of 1
        $result = $this->processor->processReady(1);

        // Only 1 should be processed
        $this->assertSame(1, $result->processed);
    }

    public function test_process_ready_drains_fully_overdue_route_jump_in_one_pass(): void
    {
        Date::setTestNow('2026-04-10 00:00:00');

        $nodes = [];
        for ($i = 0; $i <= 5; $i++) {
            $star = $this->tester->haveStar([
                'id' => "DRAIN_FULL_{$i}",
                'distanceLy' => (float) $i,
            ]);
            $nodes[] = $this->tester->getNodeForStar($star);
        }

        $route = [];
        for ($i = 0; $i < 5; $i++) {
            $edge = $this->edgeRepository->create($nodes[$i]->id, $nodes[$i + 1]->id, 1.0);
            helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge->id);
            $route[] = $edge->id;
        }

        $ship = $this->tester->haveShip([
            'name' => 'Overdue Drain Ship',
            'node_id' => $nodes[0]->id,
            'core_life' => 1000.0,
        ]);

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $nodes[0]->id,
                'target_node_id' => $nodes[5]->id,
                'route' => $route,
            ],
            'deferred_until' => new DateTimeImmutable('2026-04-01 00:00:00'),
        ]);
        $this->repository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);

        $result = $this->processor->processReady();

        $this->assertSame(1, $result->processed);

        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Fulfilled, $found->status);
        $this->assertCount(5, $found->result['phases']);
        $this->assertNull($found->processing_at);

        $state = $this->stateRepository->find($ship->postId());
        $this->assertNull($state->current_action_id);
        $this->assertSame($nodes[5]->id, $state->node_id);
    }

    public function test_process_ready_drains_overdue_route_jump_until_next_phase_is_future(): void
    {
        Date::setTestNow('2026-04-10 08:00:00');

        $star1 = $this->tester->haveStar(['id' => 'DRAIN_FUTURE_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'DRAIN_FUTURE_MID', 'distanceLy' => 1.0]);
        $star3 = $this->tester->haveStar(['id' => 'DRAIN_FUTURE_TO', 'distanceLy' => 3.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);
        $node3 = $this->tester->getNodeForStar($star3);

        $edge1 = $this->edgeRepository->create($node1->id, $node2->id, 1.0);
        $edge2 = $this->edgeRepository->create($node2->id, $node3->id, 2.0);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge1->id);
        helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->upsert(1, $edge2->id);

        $ship = $this->tester->haveShip([
            'name' => 'Future Drain Ship',
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);
        $resolvedShip = helm(ShipFactory::class)->build($ship->postId());
        $nextDuration = $resolvedShip->propulsion()->getJumpDuration($edge2->distance);
        $phaseDueAt = Date::subSeconds(Date::now(), max(1, $nextDuration - 60));

        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => [
                'from_node_id' => $node1->id,
                'target_node_id' => $node3->id,
                'route' => [$edge1->id, $edge2->id],
            ],
            'deferred_until' => $phaseDueAt,
        ]);
        $this->repository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);

        $result = $this->processor->processReady();

        $this->assertSame(1, $result->processed);

        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Running, $found->status);
        $this->assertCount(1, $found->result['phases']);
        $this->assertNull($found->processing_at);
        $this->assertGreaterThan(Date::now(), $found->deferred_until);

        $state = $this->stateRepository->find($ship->postId());
        $this->assertSame($action->id, $state->current_action_id);
        $this->assertSame($node2->id, $state->node_id);
    }

    public function test_process_ready_counts_failures(): void
    {
        $ship = $this->tester->haveShip(['name' => 'Fail Ship']);

        // Create an action that will fail (Survey has no resolver)
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Survey,
            'params' => [],
        ]);
        $this->repository->insert($action);
        $this->stateRepository->updateCurrentAction($ship->postId(), $action->id);

        // Process
        $result = $this->processor->processReady();

        // Should have 1 failure (Survey has no resolver, will fail)
        $this->assertGreaterThanOrEqual(1, $result->failed);

        // Action should be marked as failed
        $found = $this->repository->find($action->id);
        $this->assertSame(ActionStatus::Failed, $found->status);
    }

    public function test_processing_result_calculations(): void
    {
        // ProcessingResult(succeeded, failed) - succeeded count, not total
        $result = new ProcessingResult(10, 3);

        $this->assertSame(10, $result->processed);  // 10 succeeded
        $this->assertSame(3, $result->failed);       // 3 failed
        $this->assertSame(13, $result->total());     // 10 + 3 = 13 total attempted
        $this->assertSame(10, $result->succeeded()); // succeeded = processed count
    }
}
