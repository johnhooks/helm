<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Codeception\Stub;
use Helm\Lib\Date;
use Helm\Navigation\NavigationService;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\ScanPhaseResult;
use Helm\ShipLink\Actions\ScanRoute\Resolver;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ShipFactory;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Resolver
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
        $this->tester->haveOrigin();

        $this->resolver = new Resolver(
            helm(NavigationService::class),
            helm(UserEdgeRepository::class),
        );
        $this->shipFactory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function _after(): void
    {
        Date::setTestNow(null);
        parent::_after();
    }

    public function test_updates_result_with_scan_outcome(): void
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
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'skill' => 1.0,
                'efficiency' => 1.0,
                'duration' => 3600,
            ],
        ]);

        $this->resolver->handle($action, $ship);

        // Original values preserved
        $this->assertSame($node1->id, $action->result['from_node_id']);
        $this->assertSame($node2->id, $action->result['to_node_id']);
        $this->assertSame(1.0, $action->result['skill']);
        $this->assertSame(1.0, $action->result['efficiency']);

        // Scan outcome added
        $this->assertArrayHasKey('success', $action->result);
        $this->assertArrayHasKey('complete', $action->result);
        $this->assertArrayHasKey('edges_discovered', $action->result);
        $this->assertArrayHasKey('waypoints_created', $action->result);
        $this->assertArrayHasKey('path', $action->result);
        $this->assertArrayHasKey('discovered_edge_ids', $action->result);
        $this->assertArrayHasKey('discovered_node_ids', $action->result);

        $this->assertIsBool($action->result['success']);
        $this->assertIsBool($action->result['complete']);
        $this->assertIsInt($action->result['edges_discovered']);
        $this->assertIsInt($action->result['waypoints_created']);
        $this->assertIsArray($action->result['path']);
        $this->assertIsArray($action->result['discovered_edge_ids']);
        $this->assertIsArray($action->result['discovered_node_ids']);
        $this->assertArrayNotHasKey('nodes', $action->result);
        $this->assertArrayNotHasKey('edges', $action->result);
    }

    public function test_returns_discovery_ids_and_summary_without_embedded_graph_rows(): void
    {
        $star1 = $this->tester->haveStar(['id' => 'SERIAL_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'SERIAL_TO', 'distanceLy' => 5.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'skill' => 1.0,
                'efficiency' => 1.0,
                'duration' => 3600,
            ],
        ]);

        $this->resolver->handle($action, $ship);

        if (! $action->result['success']) {
            $this->markTestSkipped('Scan did not succeed - probabilistic outcome');
        }

        $this->assertNotEmpty($action->result['discovered_edge_ids']);
        $this->assertNotEmpty($action->result['discovered_node_ids']);
        $this->assertSame($action->result['edges_discovered'], count($action->result['discovered_edge_ids']));
        $this->assertCount(count($action->result['discovered_node_ids']), $action->result['path']);
        $this->assertArrayNotHasKey('nodes', $action->result);
        $this->assertArrayNotHasKey('edges', $action->result);
    }

    public function test_failed_scan_still_completes(): void
    {
        // Create stars very far apart - scan unlikely to succeed
        $star1 = $this->tester->haveStar(['id' => 'FAR_FROM', 'distanceLy' => 0.0]);
        $star2 = $this->tester->haveStar(['id' => 'FAR_TO', 'distanceLy' => 1000.0]);

        $node1 = $this->tester->getNodeForStar($star1);
        $node2 = $this->tester->getNodeForStar($star2);

        $shipPost = $this->tester->haveShip(['node_id' => $node1->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $node2->id],
            'result' => [
                'from_node_id' => $node1->id,
                'to_node_id' => $node2->id,
                'skill' => 0.1,
                'efficiency' => 0.1,
                'duration' => 36000,
            ],
        ]);

        // Should not throw - failed scan is still a valid completion
        $this->resolver->handle($action, $ship);

        $this->assertIsBool($action->result['success']);
        $this->assertIsInt($action->result['edges_discovered']);
        $this->assertIsInt($action->result['waypoints_created']);
        $this->assertIsArray($action->result['path']);
        $this->assertIsArray($action->result['discovered_edge_ids']);
        $this->assertIsArray($action->result['discovered_node_ids']);
        $this->assertArrayNotHasKey('nodes', $action->result);
        $this->assertArrayNotHasKey('edges', $action->result);
    }

    public function test_continuing_scan_schedules_next_checkpoint_from_start_time(): void
    {
        Date::setTestNow('2026-04-01 00:30:00');

        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);
        $waypoint = $this->nodeRepository->create(5.0, 0.0, 0.0);
        $edge = $this->edgeRepository->create($from->id, $waypoint->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = new Resolver(
            Stub::make(NavigationService::class, [
                'scanNextHop' => fn () => ScanPhaseResult::waypoint($waypoint, $edge),
                'rollScanContinuation' => fn () => [
                    'probability' => 0.85,
                    'roll' => 0.1,
                    'continues' => true,
                ],
            ], $this),
            helm(UserEdgeRepository::class),
        );

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $target->id],
            'result' => [
                'from_node_id' => $from->id,
                'to_node_id' => $target->id,
                'skill' => 1.0,
                'efficiency' => 1.0,
                'started_at' => '2026-04-01 00:00:00',
                'cycle_seconds' => 300,
                'phases' => [],
            ],
        ]);

        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Running, $action->status);
        $this->assertSame('2026-04-01 00:10:00', Date::toString($action->deferred_until));
        $this->assertLessThan(Date::now(), $action->deferred_until);
        $this->assertCount(1, $action->result['phases']);
    }

    public function test_failed_continuation_finishes_as_partial(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);
        $waypoint = $this->nodeRepository->create(5.0, 0.0, 0.0);
        $edge = $this->edgeRepository->create($from->id, $waypoint->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = new Resolver(
            Stub::make(NavigationService::class, [
                'scanNextHop' => fn () => ScanPhaseResult::waypoint($waypoint, $edge),
                'rollScanContinuation' => fn () => [
                    'probability' => 0.85,
                    'roll' => 0.9,
                    'continues' => false,
                ],
            ], $this),
            helm(UserEdgeRepository::class),
        );

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $target->id],
            'result' => [
                'from_node_id' => $from->id,
                'to_node_id' => $target->id,
                'skill' => 1.0,
                'efficiency' => 1.0,
                'started_at' => '2026-04-01 00:00:00',
                'cycle_seconds' => 300,
                'phases' => [],
            ],
        ]);

        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Partial, $action->status);
        $this->assertTrue($action->result['success']);
        $this->assertFalse($action->result['complete']);
        $this->assertFalse($action->result['phases'][0]['continues']);
    }

    public function test_phase_limit_finishes_as_partial_without_resolving_another_checkpoint(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);
        $waypoint = $this->nodeRepository->create(5.0, 0.0, 0.0);
        $edge = $this->edgeRepository->create($from->id, $waypoint->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = new Resolver(
            Stub::make(NavigationService::class, [
                'scanNextHop' => static fn () => throw new \RuntimeException('Should not resolve another phase'),
            ], $this),
            helm(UserEdgeRepository::class),
        );

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'params' => ['target_node_id' => $target->id],
            'result' => [
                'from_node_id' => $from->id,
                'to_node_id' => $target->id,
                'skill' => 1.0,
                'efficiency' => 1.0,
                'started_at' => '2026-04-01 00:00:00',
                'cycle_seconds' => 300,
                'max_scan_phases' => 1,
                'path' => [$waypoint->id],
                'discovered_edge_ids' => [$edge->id],
                'discovered_node_ids' => [$waypoint->id],
                'phases' => [
                    [
                        'phase_number' => 1,
                        'from_node_id' => $from->id,
                        'target_node_id' => $target->id,
                        'discovered_node_id' => $waypoint->id,
                        'discovered_edge_id' => $edge->id,
                        'outcome' => 'waypoint',
                    ],
                ],
            ],
        ]);

        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Partial, $action->status);
        $this->assertSame('phase_limit', $action->result['stopped_reason']);
        $this->assertCount(1, $action->result['phases']);
    }
}
