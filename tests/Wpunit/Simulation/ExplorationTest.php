<?php

declare(strict_types=1);

namespace Tests\Wpunit\Simulation;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\NodeType;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\Resources\ActionResource;
use Helm\ShipLink\Ship;
use Tests\Support\WpunitTester;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * Runs real navigation generation, action handlers, and scheduling in memory.
 * Only random rolls are controlled; routes are discovered rather than seeded.
 *
 * @property WpunitTester $tester
 */
class ExplorationTest extends WPTestCase
{
    public function _before(): void
    {
        parent::_before();
        $this->tester->haveSimulation('exploration-test');
        $this->tester->haveSimulationRolls(...array_fill(0, 100, 0.0));
        // Long-range fixture ensures multiple generated waypoints are necessary.
        $this->tester->haveSimulationProduct('vrs_mk1', ['range' => 30.0]);
        $this->tester->haveSimulationNode(0.0);
        $this->tester->haveSimulationNode(20.0);
    }

    /** @dataProvider explorationCorridors */
    public function test_scan_discovers_a_path_one_checkpoint_at_a_time_then_jumps_each_leg(string $seed, float $x, float $y, float $z): void
    {
        $this->tester->haveSimulation($seed);
        $this->tester->haveSimulationRolls(...array_fill(0, 100, 0.0));
        $this->tester->haveSimulationProduct('vrs_mk1', ['range' => 30.0]);
        $origin = $this->tester->haveSimulationNode(0.0);
        $target = $this->tester->haveSimulationNode($x, $y, $z);
        $cursor = $origin;
        $path = [$origin->id];
        $ship = $this->tester->haveSimulationShip('Explorer', 1);
        $scan = $this->scan($ship, 2);
        $intent = $scan->params;
        $startedAt = Date::now();
        $this->assertNull($scan->result);
        $this->assertSame(0, $this->tester->advanceSimulation(299)->processed);

        for ($cycle = 1; $cycle <= 50; $cycle++) {
            $result = $this->tester->advanceSimulationToNextCheckpoint();
            $this->assertSame(1, $result->processed);
            $this->assertSame(0, $result->failed);
            $scan = $this->tester->grabSimulationAction($scan->id);
            $phase = $scan->result['phases'][$cycle - 1];
            $this->assertSame($cursor->id, $phase['from_node_id']);
            $next = $this->tester->grabSimulationNode($phase['discovered_node_id']);
            $this->assertLessThan($cursor->distanceTo($target), $next->distanceTo($target));
            $this->assertNotContains($next->id, $path);
            $path[] = $next->id;
            $this->assertSame($path, $scan->result['path']);
            $this->assertSame($next->id, $scan->runtime_state['current_node_id']);
            $this->assertSame($cycle, $scan->runtime_state['depth']);
            $this->assertSame($cursor->id, $scan->runtime_state['cycles'][$cycle - 1]['from_node_id']);
            $cursor = $next;

            // Processing again at the same clock must not repeat the checkpoint.
            $publicResult = $scan->result;
            $privateState = $scan->runtime_state;
            $this->assertSame(0, $this->tester->processSimulationReadyActions()->processed);
            $scan = $this->tester->grabSimulationAction($scan->id);
            $this->assertSame($publicResult, $scan->result);
            $this->assertSame($privateState, $scan->runtime_state);
            $this->assertCount($cycle, $scan->result['phases']);
            $this->assertCount($cycle + 1, $scan->result['path']);
            $this->assertEquals($intent, $scan->params);
            $this->assertSame(1, $this->tester->grabSimulationShip($ship->getId())->navigation()->getCurrentPosition());
            $this->assertSame($startedAt->getTimestamp() + 300 * $cycle, Date::now()->getTimestamp());
            $this->assertArrayNotHasKey('runtime_state', (new ActionResource($scan))->toArray());
            $this->assertSame($cycle, helm(UserEdgeRepository::class)->count(1));
            $this->assertSame(0, helm(UserEdgeRepository::class)->count(2));
            if ($scan->status->isFinalState()) {
                break;
            }
            $this->assertSame(ActionStatus::Running, $scan->status);
            $this->assertSame($scan->id, $this->tester->grabSimulationShip($ship->getId())->getState()->current_action_id);
            $this->assertNull($scan->processing_at);
        }

        $this->assertSame(ActionStatus::Fulfilled, $scan->status);
        $this->assertCount(count($scan->result['phases']), $scan->runtime_state['cycles']);
        $this->assertGreaterThanOrEqual(3, count($scan->result['path']));
        $this->assertPath($scan, 1, 2);
        $history = $scan->runtime_state;
        $this->assertSame('target_reached', $history['cycles'][count($history['cycles']) - 1]['outcome']);
        $this->assertSame(0, $this->tester->advanceSimulation(300)->processed);
        helm(\Helm\ShipLink\Actions\ScanRoute\Resolver::class)->handle($scan, $ship);
        $this->assertSame($history, $this->tester->grabSimulationAction($scan->id)->runtime_state);
        $this->assertSame(ActionStatus::Fulfilled, $scan->status);
        $jump = $this->jump($ship, $scan);
        $params = $jump->params;
        $coreBefore = $this->tester->grabSimulationShip($ship->getId())->getLoadout()->core()->component()->life;
        foreach (array_slice($scan->result['path'], 1) as $index => $nodeId) {
            $due = $jump->deferred_until;
            $this->assertSame(0, $this->tester->processSimulationReadyActions()->processed);
            $this->assertSame(1, $this->tester->advanceSimulationToNextCheckpoint()->processed);
            $jump = $this->tester->grabSimulationAction($jump->id);
            $current = $this->tester->grabSimulationShip($ship->getId());
            $this->assertSame($nodeId, $current->navigation()->getCurrentPosition());
            $this->assertCount($index + 1, $jump->result['phases']);
            $this->assertEquals($params, $jump->params);
            $this->assertEquals($due, Date::now());
            $cost = (int) ceil($jump->result['phases'][$index]['core_cost']);
            $this->assertSame($coreBefore - $cost, $current->getLoadout()->core()->component()->life);
            $coreBefore -= $cost;
            $this->assertSame($nodeId === 2 ? null : $jump->id, $current->getState()->current_action_id);
        }
        $this->assertSame(ActionStatus::Fulfilled, $jump->status);
        $this->assertSame(0, $this->tester->advanceSimulationToNextCheckpoint()->processed);
    }

    /** @return array<string, array{string, float, float, float}> */
    public static function explorationCorridors(): array
    {
        return [
            'straight corridor' => ['exploration-test', 20.0, 0.0, 0.0],
            'diagonal corridor' => ['diagonal-test', 12.0, 9.0, -8.0],
            'negative coordinates' => ['negative-test', -10.0, -14.0, 8.0],
        ];
    }

    public function test_partial_scan_can_be_flown_then_scanning_resumes_from_the_waypoint(): void
    {
        $ship = $this->tester->haveSimulationShip('Explorer', 1);
        $this->tester->haveSimulationRolls(...array_fill(0, 100, 1.0));
        $visited = [1];
        for ($attempt = 0; $attempt < 50; $attempt++) {
            $origin = $this->tester->grabSimulationShip($ship->getId())->navigation()->getCurrentPosition();
            $scan = $this->scan($ship, 2);
            $this->assertSame(0, $this->tester->advanceSimulationUntilIdle()->failed);
            $scan = $this->tester->grabSimulationAction($scan->id);
            $path = $scan->result['path'];
            $destination = $path[count($path) - 1];
            $this->assertPath($scan, $origin, $destination);
            $this->assertCount(1, $scan->result['phases']);
            $this->assertSame($destination === 2 ? ActionStatus::Fulfilled : ActionStatus::Partial, $scan->status);
            $this->assertCount(count($scan->result['phases']), $scan->runtime_state['cycles']);
            $jump = $this->jump($ship, $scan);
            $this->assertSame(0, $this->tester->advanceSimulationUntilIdle()->failed);
            $this->assertSame(ActionStatus::Fulfilled, $this->tester->grabSimulationAction($jump->id)->status);
            $visited[] = $this->tester->grabSimulationShip($ship->getId())->navigation()->getCurrentPosition();
            if ($destination === 2) {
                break;
            }
        }
        $this->assertSame(2, end($visited));
        $this->assertGreaterThanOrEqual(4, count($visited));
        $this->assertSame($visited, array_values(array_unique($visited)));
    }

    public function test_rescanning_reuses_waypoints_and_overdue_jumps_drain_the_entire_path(): void
    {
        $ship = $this->tester->haveSimulationShip('Explorer', 1);
        $first = $this->scan($ship, 2);
        $this->tester->advanceSimulationUntilIdle();
        $first = $this->tester->grabSimulationAction($first->id);
        $nodeCount = helm(NodeRepository::class)->count();
        $edgeCount = helm(UserEdgeRepository::class)->count(1);
        $second = $this->scan($ship, 2);
        $this->assertSame(0, $this->tester->advanceSimulation(300 * 50)->failed);
        $second = $this->tester->grabSimulationAction($second->id);
        $this->assertSame(ActionStatus::Fulfilled, $second->status);
        $this->assertSame($first->result, $second->result);
        $this->assertSame($nodeCount, helm(NodeRepository::class)->count());
        $this->assertSame($edgeCount, helm(UserEdgeRepository::class)->count(1));
        $jump = $this->jump($ship, $second);
        $this->assertSame(0, $this->tester->advanceSimulation(86400 * 365)->failed);
        $jump = $this->tester->grabSimulationAction($jump->id);
        $this->assertSame(ActionStatus::Fulfilled, $jump->status);
        $this->assertCount(count($second->result['phases']), $jump->result['phases']);
        $this->assertSame(2, $this->tester->grabSimulationShip($ship->getId())->navigation()->getCurrentPosition());

        // The same discovered connections form a valid route in reverse order.
        $return = $this->tester->dispatchSimulationAction($ship->getId(), ActionType::Jump, [
            'from_node_id' => 2,
            'target_node_id' => 1,
            'route' => array_reverse($second->result['discovered_edge_ids']),
        ]);
        $this->assertSame(0, $this->tester->advanceSimulationUntilIdle()->failed);
        $return = $this->tester->grabSimulationAction($return->id);
        $this->assertSame(ActionStatus::Fulfilled, $return->status);
        $this->assertCount(count($second->result['phases']), $return->result['phases']);
        $this->assertSame(1, $this->tester->grabSimulationShip($ship->getId())->navigation()->getCurrentPosition());
    }

    public function test_core_loss_between_legs_stops_at_the_last_reached_waypoint(): void
    {
        $ship = $this->tester->haveSimulationShip('Explorer', 1);
        $scan = $this->scan($ship, 2);
        $this->tester->advanceSimulationUntilIdle();
        $scan = $this->tester->grabSimulationAction($scan->id);
        $jump = $this->jump($ship, $scan);
        $this->tester->advanceSimulationToNextCheckpoint();
        $current = $this->tester->grabSimulationShip($ship->getId());
        $this->assertSame($scan->result['path'][1], $current->navigation()->getCurrentPosition());
        $this->tester->setSimulationCoreLife($ship->getId(), 0);

        $this->assertSame(1, $this->tester->advanceSimulationToNextCheckpoint()->failed);
        $jump = $this->tester->grabSimulationAction($jump->id);
        $this->assertSame(ActionStatus::Failed, $jump->status);
        $this->assertCount(1, $jump->result['phases']);
        $this->assertSame($scan->result['path'][1], $this->tester->grabSimulationShip($ship->getId())->navigation()->getCurrentPosition());
        $this->assertNull($this->tester->grabSimulationShip($ship->getId())->getState()->current_action_id);
        $this->assertSame(0, $this->tester->advanceSimulationUntilIdle()->processed);
    }

    private function scan(Ship $ship, int $target): Action
    {
        return $this->tester->dispatchSimulationAction($ship->getId(), ActionType::ScanRoute, ['target_node_id' => $target]);
    }

    private function jump(Ship $ship, Action $scan): Action
    {
        $path = $scan->result['path'];
        return $this->tester->dispatchSimulationAction($ship->getId(), ActionType::Jump, [
            'from_node_id' => $path[0],
            'target_node_id' => $path[count($path) - 1],
            'route' => $scan->result['discovered_edge_ids'],
        ]);
    }

    private function assertPath(Action $scan, int $origin, int $target): void
    {
        $path = $scan->result['path'];
        $this->assertSame($origin, $path[0]);
        $this->assertSame($target, $path[count($path) - 1]);
        $this->assertCount(count($path) - 1, $scan->result['discovered_edge_ids']);
        foreach ($scan->result['discovered_edge_ids'] as $index => $edgeId) {
            $edge = helm(EdgeRepository::class)->get($edgeId);
            $this->assertSame($path[$index + 1], $edge->otherNode($path[$index]));
            $phase = $scan->result['phases'][$index];
            $this->assertSame($path[$index], $phase['from_node_id']);
            $this->assertSame($path[$index + 1], $phase['discovered_node_id']);
            $node = helm(NodeRepository::class)->get($path[$index + 1]);
            if ($node->id !== $scan->params['target_node_id']) {
                $this->assertSame(NodeType::Waypoint, $node->type);
                $this->assertNotEmpty($node->hash);
            }
        }
    }
}
