<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NodeRepository;
use Helm\ShipLink\ActionProcessor;
use Helm\ShipLink\ActionRepository;
use Helm\ShipLink\ActionResolver;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ProcessingResult;
use Helm\ShipLink\ShipSystemsRepository;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ActionProcessor
 *
 * @property WpunitTester $tester
 */
class ActionProcessorTest extends \Codeception\TestCase\WPTestCase
{
    private ActionRepository $repository;
    private ActionProcessor $processor;
    private ShipSystemsRepository $systemsRepository;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();

        $this->tester->haveOrigin();

        $this->repository = new ActionRepository();
        $this->systemsRepository = new ShipSystemsRepository();
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);

        // Get the processor from container (it has all dependencies wired)
        $this->processor = helm(ActionProcessor::class);
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

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        // Create edge between nodes
        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip([
            'name' => 'Process Ship',
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);

        // Create a ready action (no deferred_until means immediately ready)
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
        ]);
        $this->repository->insert($action);
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

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

        $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
        $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

        $this->edgeRepository->create($node1->id, $node2->id, 5.0);

        $ship = $this->tester->haveShip([
            'name' => 'Past Deferred Ship',
            'node_id' => $node1->id,
            'core_life' => 1000.0,
        ]);

        // Create an action that was deferred but is now ready
        $action = new Action([
            'ship_post_id' => $ship->postId(),
            'type' => ActionType::Jump,
            'params' => ['target_node_id' => $node2->id],
            'deferred_until' => new DateTimeImmutable('-1 minute'),
        ]);
        $this->repository->insert($action);
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

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

            $node1 = $this->nodeRepository->getByStarPostId($star1->postId());
            $node2 = $this->nodeRepository->getByStarPostId($star2->postId());

            $this->edgeRepository->create($node1->id, $node2->id, 5.0);

            $ship = $this->tester->haveShip([
                'name' => "Limit Ship {$i}",
                'node_id' => $node1->id,
                'core_life' => 1000.0,
            ]);

            $action = new Action([
                'ship_post_id' => $ship->postId(),
                'type' => ActionType::Jump,
                'params' => ['target_node_id' => $node2->id],
            ]);
            $this->repository->insert($action);
            $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);
        }

        // Process with limit of 1
        $result = $this->processor->processReady(1);

        // Only 1 should be processed
        $this->assertSame(1, $result->processed);
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
        $this->systemsRepository->updateCurrentAction($ship->postId(), $action->id);

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
