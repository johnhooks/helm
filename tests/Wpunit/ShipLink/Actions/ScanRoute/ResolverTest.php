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
    }

    public function _after(): void
    {
        Date::setTestNow(null);
        parent::_after();
    }

    /**
     * @param array<string, mixed> $stubMethods
     */
    private function makeResolver(array $stubMethods): Resolver
    {
        return new Resolver(
            Stub::make(NavigationService::class, array_merge([
                'rollScanContinuation' => static fn () => ['probability' => 0.8, 'roll' => 0.1, 'continues' => true],
            ], $stubMethods), $this),
            helm(UserEdgeRepository::class),
        );
    }

    /**
     * @param array<string, mixed> $runtimeOverrides
     */
    private function buildAction(int $shipPostId, int $fromNodeId, int $targetNodeId, array $runtimeOverrides = []): Action
    {
        return new Action([
            'ship_post_id' => $shipPostId,
            'type' => ActionType::ScanRoute,
            'status' => ActionStatus::Running,
            'params' => [
                'target_node_id' => $targetNodeId,
                'from_node_id' => $fromNodeId,
            ],
            'runtime_state' => array_merge([
                'cycle_index' => 1,
                'cycle_seconds' => 300,
                'max_cycles' => 50,
                'started_at' => '2026-04-01 00:00:00',
                'cycles' => [],
            ], $runtimeOverrides),
        ]);
    }

    public function test_no_discovery_cycle_stays_running_and_records_private_state(): void
    {
        Date::setTestNow('2026-04-01 00:30:00');

        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = $this->makeResolver([
            'scanNextHop' => static fn () => ScanPhaseResult::failure(),
        ]);

        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id);
        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Running, $action->status);
        $this->assertNull($action->result);
        $this->assertSame(2, $action->runtime_state['cycle_index']);
        $this->assertCount(1, $action->runtime_state['cycles']);
        $this->assertSame('no_discovery', $action->runtime_state['cycles'][0]['outcome']);
    }

    public function test_next_checkpoint_is_anchored_to_scan_start_time(): void
    {
        Date::setTestNow('2026-04-01 00:30:00');

        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = $this->makeResolver([
            'scanNextHop' => static fn () => ScanPhaseResult::failure(),
        ]);

        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id);
        $resolver->handle($action, $ship);

        // Cycle 2 is due at start + 600s even though processing ran at 00:30
        $this->assertSame('2026-04-01 00:10:00', Date::toString($action->deferred_until));
        $this->assertLessThan(Date::now(), $action->deferred_until);
    }

    public function test_stopped_continuation_finishes_partial_with_public_result_only(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);
        $waypoint = $this->nodeRepository->create(5.0, 0.0, 0.0);
        $edge = $this->edgeRepository->create($from->id, $waypoint->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = $this->makeResolver([
            'scanNextHop' => static fn () => ScanPhaseResult::waypoint($waypoint, $edge),
            'rollScanContinuation' => static fn () => ['probability' => 0.1, 'roll' => 0.9, 'continues' => false],
        ]);

        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id);
        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Partial, $action->status);
        $this->assertFalse($action->runtime_state['cycles'][0]['continuation']['continues']);
        $this->assertNotNull($action->runtime_state);
        $this->assertSame([$from->id, $waypoint->id], $action->result['path']);
        $this->assertSame([$edge->id], $action->result['discovered_edge_ids']);
        $this->assertSame([$waypoint->id], $action->result['discovered_node_ids']);
        $this->assertCount(1, $action->result['phases']);
        $this->assertArrayNotHasKey('skill', $action->result);
        $this->assertArrayNotHasKey('efficiency', $action->result);
        $this->assertArrayNotHasKey('continuation_probability', $action->result['phases'][0]);
        $this->assertArrayNotHasKey('continuation_roll', $action->result['phases'][0]);
    }

    public function test_direct_target_discovery_fulfills(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(5.0, 0.0, 0.0);
        $edge = $this->edgeRepository->create($from->id, $target->id, 5.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = $this->makeResolver([
            'scanNextHop' => static fn () => ScanPhaseResult::direct($target, $edge),
        ]);

        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id);
        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertSame('target_reached', $action->runtime_state['cycles'][0]['outcome']);
        $this->assertSame($target->id, $action->runtime_state['current_node_id']);
        $this->assertNotNull($action->runtime_state);
        $this->assertSame([$from->id, $target->id], $action->result['path']);
        $this->assertSame([$edge->id], $action->result['discovered_edge_ids']);
    }

    public function test_each_cycle_uses_live_ship_stats(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $capturedSkill = null;
        $capturedEfficiency = null;

        $resolver = $this->makeResolver([
            'scanNextHop' => static function (
                int $fromNodeId,
                int $toNodeId,
                float $skill,
                float $efficiency,
                bool $rollFirstHop
            ) use (
                &$capturedSkill,
                &$capturedEfficiency
            ) {
                $capturedSkill = $skill;
                $capturedEfficiency = $efficiency;
                return ScanPhaseResult::failure();
            },
        ]);

        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id);
        $resolver->handle($action, $ship);

        $this->assertSame($ship->navigation()->getSkill(), $capturedSkill);
        $this->assertSame($ship->navigation()->getEfficiency(), $capturedEfficiency);
    }

    public function test_fails_when_ship_no_longer_at_scan_origin(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);
        $elsewhere = $this->nodeRepository->create(10.0, 0.0, 0.0);

        $shipPost = $this->tester->haveShip(['node_id' => $elsewhere->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = $this->makeResolver([
            'scanNextHop' => static fn () => throw new \RuntimeException('Should not scan'),
        ]);

        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id);
        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Failed, $action->status);
        $this->assertNotNull($action->runtime_state);
    }

    public function test_fails_without_runtime_state(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = $this->makeResolver([
            'scanNextHop' => static fn () => throw new \RuntimeException('Should not scan'),
        ]);

        $action = new Action([
            'ship_post_id' => $shipPost->postId(),
            'type' => ActionType::ScanRoute,
            'status' => ActionStatus::Running,
            'params' => [
                'target_node_id' => $target->id,
                'from_node_id' => $from->id,
            ],
        ]);

        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Failed, $action->status);
    }

    public function test_exceeding_max_cycles_fulfills_with_empty_result(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = $this->makeResolver([
            'scanNextHop' => static fn () => throw new \RuntimeException('Should not resolve another cycle'),
        ]);

        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id, [
            'cycle_index' => 3,
            'max_cycles' => 2,
        ]);

        $resolver->handle($action, $ship);

        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertNotNull($action->runtime_state);
        $this->assertSame([$from->id], $action->result['path']);
        $this->assertSame([], $action->result['phases']);
        $this->assertSame([], $action->result['discovered_edge_ids']);
    }

    public function test_private_state_survives_persistence_between_checkpoints(): void
    {
        Date::setTestNow('2026-04-01 00:05:00');

        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);

        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());

        $resolver = $this->makeResolver([
            'scanNextHop' => static fn () => ScanPhaseResult::failure(),
        ]);

        $repository = helm(\Helm\ShipLink\Contracts\ActionRepository::class);

        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id);
        $repository->insert($action);

        $resolver->handle($action, $ship);
        $repository->update($action);

        $reloaded = $repository->find($action->id);
        $this->assertSame(2, $reloaded->runtime_state['cycle_index']);
        $this->assertCount(1, $reloaded->runtime_state['cycles']);

        // Second checkpoint resumes from the persisted state
        Date::setTestNow('2026-04-01 00:10:00');
        $resolver->handle($reloaded, $ship);

        $this->assertSame(3, $reloaded->runtime_state['cycle_index']);
        $this->assertCount(2, $reloaded->runtime_state['cycles']);
        $this->assertSame('2026-04-01 00:15:00', Date::toString($reloaded->deferred_until));
    }

    public function test_discoveries_accumulate_publicly_while_private_cursor_resumes_after_a_miss(): void
    {
        Date::setTestNow('2026-04-01 00:30:00');
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $first = $this->nodeRepository->create(5.0, 0.0, 0.0);
        $second = $this->nodeRepository->create(10.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(15.0, 0.0, 0.0);
        $edges = [
            $this->edgeRepository->create($from->id, $first->id, 5.0),
            $this->edgeRepository->create($first->id, $second->id, 5.0),
            $this->edgeRepository->create($second->id, $target->id, 5.0),
        ];
        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());
        $sources = [];
        $firstHopFlags = [];
        $depths = [];
        $outcomes = [
            ScanPhaseResult::waypoint($first, $edges[0]),
            ScanPhaseResult::failure(),
            ScanPhaseResult::waypoint($second, $edges[1]),
            ScanPhaseResult::direct($target, $edges[2]),
        ];
        $resolver = $this->makeResolver([
            'scanNextHop' => static function ($fromNodeId, $toNodeId, $skill, $efficiency, $rollFirstHop) use (&$sources, &$firstHopFlags, &$outcomes) {
                $sources[] = $fromNodeId;
                $firstHopFlags[] = $rollFirstHop;
                return array_shift($outcomes);
            },
            'rollScanContinuation' => static function ($fromNodeId, $toNodeId, $skill, $efficiency, $hopIndex) use (&$depths) {
                $depths[] = $hopIndex;
                return ['probability' => 0.8, 'roll' => 0.1, 'continues' => true];
            },
        ]);
        $repository = helm(\Helm\ShipLink\Contracts\ActionRepository::class);
        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id);
        $params = $action->params;
        $repository->insert($action);

        foreach ([1, 1, 2, 3] as $index => $discoveredCount) {
            $previousResult = $action->result;
            $previousCursor = $action->runtime_state['current_node_id'] ?? null;
            $resolver->handle($action, $ship);
            $repository->update($action);
            $action = $repository->find($action->id);
            if ($index === 1) {
                $this->assertSame($previousResult, $action->result);
                $this->assertSame($previousCursor, $action->runtime_state['current_node_id']);
            }
            $public = (new \Helm\ShipLink\Resources\ActionResource($action))->toArray();
            $this->assertArrayNotHasKey('runtime_state', $public);
            $this->assertCount($discoveredCount, $public['result']['phases']);
            $this->assertCount($discoveredCount, $public['result']['discovered_edge_ids']);
            $this->assertEquals($params, $action->params);
            $this->assertSame($from->id, $ship->navigation()->getCurrentPosition());
            $this->assertArrayNotHasKey('cycles', $public['result']);
            foreach ($public['result']['phases'] as $phase) {
                $this->assertEqualsCanonicalizing(['from_node_id', 'target_node_id', 'discovered_node_id', 'discovered_edge_id'], array_keys($phase));
            }
            if ($index < 3) {
                $this->assertSame(ActionStatus::Running, $action->status);
                $this->assertSame($discoveredCount, $action->runtime_state['depth']);
                $this->assertSame($index + 2, $action->runtime_state['cycle_index']);
                $this->assertSame('2026-04-01 00:' . str_pad((string) (($index + 2) * 5), 2, '0', STR_PAD_LEFT) . ':00', Date::toString($action->deferred_until));
            }
        }
        $this->assertSame([$from->id, $first->id, $first->id, $second->id], $sources);
        $this->assertSame([true, false, false, false], $firstHopFlags);
        $this->assertSame([1, 2], $depths);
        $this->assertSame([$from->id, $first->id, $second->id, $target->id], $action->result['path']);
        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertNotNull($action->runtime_state);
        $known = helm(UserEdgeRepository::class)->paginate($ship->getOwnerId(), 1, 100)['edges'];
        $knownIds = array_map(static fn ($edge) => $edge->edgeId, $known);
        foreach ($edges as $edge) {
            $this->assertContains($edge->id, $knownIds);
        }
    }

    public function test_cycle_limit_retains_discoveries_and_finishes_partial(): void
    {
        $from = $this->nodeRepository->create(0.0, 0.0, 0.0);
        $target = $this->nodeRepository->create(20.0, 0.0, 0.0);
        $waypoint = $this->nodeRepository->create(5.0, 0.0, 0.0);
        $edge = $this->edgeRepository->create($from->id, $waypoint->id, 5.0);
        $shipPost = $this->tester->haveShip(['node_id' => $from->id]);
        $ship = $this->shipFactory->build($shipPost->postId());
        $action = $this->buildAction($shipPost->postId(), $from->id, $target->id, ['max_cycles' => 2]);
        $this->makeResolver([
            'scanNextHop' => static fn () => ScanPhaseResult::waypoint($waypoint, $edge),
        ])->handle($action, $ship);
        $discovered = $action->result;
        $this->assertSame(ActionStatus::Running, $action->status);
        $this->makeResolver([
            'scanNextHop' => static fn () => ScanPhaseResult::failure(),
        ])->handle($action, $ship);
        $this->assertSame(ActionStatus::Partial, $action->status);
        $this->assertSame($discovered, $action->result);
        $this->assertSame(['waypoint', 'no_discovery'], array_column($action->runtime_state['cycles'], 'outcome'));
        $this->assertSame(2, $action->runtime_state['cycle_index']);
        $this->assertNotNull($action->runtime_state);
    }
}
