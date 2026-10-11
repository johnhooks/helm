<?php

declare(strict_types=1);

namespace Tests\Wpunit\Simulation;

use Helm\Lib\Date;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Actions\ScanRoute\Rules;
use Helm\ShipLink\Actions\ScanRoute\RuntimeState;
use Helm\ShipLink\Actions\ScanRoute\StopReason;
use Helm\ShipLink\Resources\ActionResource;
use Helm\Simulation\ScanRunner;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Resolver
 * @covers \Helm\ShipLink\Actions\ScanRoute\Rules
 * @property WpunitTester $tester
 */
class WorkScanTest extends WPTestCase
{
    private function scenario(float $distance = 0.5): array
    {
        $simulation = $this->tester->haveSimulation('work-scan');
        $this->tester->haveSimulationProduct('vrs_mk1', ['range' => 30.0]);
        $origin = $this->tester->haveSimulationNode(0);
        $target = $this->tester->haveSimulationNode($distance);
        $ship = $this->tester->haveSimulationShip('Explorer', 1, $origin->id);
        $action = $simulation->dispatch($ship->getId(), ActionType::ScanRoute, ['target_node_id' => $target->id]);
        return [$simulation, $ship, $action, $target];
    }

    public function test_failed_attempts_cost_core_preserve_work_and_publish_chance_without_advancing(): void
    {
        [$simulation, $ship, $action] = $this->scenario();
        $this->tester->haveSimulationRolls(0.0, 1.0, 1.0, 1.0);
        $core = $ship->power()->getCoreLife();
        $initial = (new ActionResource($action))->toArray()['result']['progress']['discovery_chance'];
        $simulation->advanceToNextCheckpoint();
        $work = $action->runtime_state['work'];
        $this->assertGreaterThan(0, $work);
        $this->assertGreaterThanOrEqual($initial, (new ActionResource($action))->toArray()['result']['progress']['discovery_chance']);
        $simulation->advanceToNextCheckpoint();
        $this->assertSame($work, $action->runtime_state['work']);
        $this->assertEquals($core - 2, $simulation->getShip($ship->getId())->power()->getCoreLife());
        $this->assertArrayNotHasKey('history', $action->result);
        $this->assertArrayNotHasKey('history', $action->runtime_state);
        $this->assertArrayNotHasKey('progress', $action->result);
        $before = $action->result;
        $time = Date::now();
        $public = (new ActionResource($action))->toArray();
        $this->assertArrayNotHasKey('runtime_state', $public);
        $this->assertSame($before, $action->result);
        $this->assertEquals($time, Date::now());
        $this->assertSame(0, $simulation->processReady()->processed);
        $this->assertSame($before, $action->result);
        $this->assertSame(ActionStatus::Running, $action->status);
    }

    public function test_first_cycle_can_discover_without_adding_work(): void
    {
        [$simulation, $ship, $action, $target] = $this->scenario();
        $this->tester->haveSimulationRolls(1.0, 0.0005);
        $simulation->advanceToNextCheckpoint();
        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertContains($target->id, $action->result['discovered_node_ids']);
        $this->assertSame(1, $action->runtime_state['completed']);
    }

    public function test_budget_stops_before_an_extra_charge_and_preserves_partial_route_on_restart(): void
    {
        [$simulation, $ship, $action, $target] = $this->scenario(20);
        $action->runtime_state = [...$action->runtime_state, 'coreBudget' => 1];
        $this->tester->haveSimulationRolls(0, 0);
        $simulation->advanceToNextCheckpoint();
        $this->assertSame(ActionStatus::Partial, $action->status);
        $this->assertSame('resource_budget_reached', (new ActionResource($action))->toArray()['result']['progress']['stop_reason']);
        $this->assertSame(1, (new ActionResource($action))->toArray()['result']['progress']['spent']['core_life']);
        $this->assertSame(0, $simulation->advanceUntilIdle()->processed);
        $this->assertSame(1, $action->runtime_state['depth']);
        $this->assertSame(0.0, $action->runtime_state['work']);
        $next = $simulation->dispatch($ship->getId(), ActionType::ScanRoute, ['target_node_id' => $target->id]);
        $this->assertArrayNotHasKey('history', $next->result);
        $this->assertNull($next->result['stop_reason']);
        $this->assertArrayNotHasKey('history', $action->result);
        $this->assertSame(1, $next->runtime_state['depth']);
        $this->assertSame($action->runtime_state['source'], $next->runtime_state['source']);
        $this->assertSame($action->result['path'], $next->result['path']);
    }

    public function test_no_discovery_budget_outcome_and_live_core_exhaustion_are_distinct(): void
    {
        [$simulation, $ship, $action] = $this->scenario();
        $action->runtime_state = [...$action->runtime_state, 'coreBudget' => 1];
        $this->tester->haveSimulationRolls(1, 1);
        $simulation->advanceUntilIdle();
        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertSame([], $action->result['discovered_edge_ids']);
        $this->assertSame('resource_budget_reached', (new ActionResource($action))->toArray()['result']['progress']['stop_reason']);
        $next = $simulation->dispatch($ship->getId(), ActionType::ScanRoute, ['target_node_id' => 2]);
        $this->tester->setSimulationCoreLife($ship->getId(), 0);
        $simulation->advanceUntilIdle();
        $this->assertSame('resource_exhausted', (new ActionResource($next))->toArray()['result']['progress']['stop_reason']);
        $this->assertSame(0, (new ActionResource($next))->toArray()['result']['progress']['spent']['core_life']);
    }

    public function test_cutoff_uses_ceiling_not_initial_chance_and_drops_after_discovery(): void
    {
        [$simulation, $ship, $action] = $this->scenario(20);
        $state = RuntimeState::fromArray($action->runtime_state);
        $rules = helm(Rules::class);
        $this->assertEqualsWithDelta(0.001, $rules->nextChance($state), 1e-12);
        $this->assertNull($rules->stopReason($state, 1000));
        $initial = $state->ceiling;
        $action->runtime_state = [...$state->toArray(), 'minCeiling' => 0.5];
        $this->tester->haveSimulationRolls(0, 0);
        $simulation->advanceToNextCheckpoint();
        $this->assertSame(ActionStatus::Partial, $action->status);
        $this->assertLessThan($initial, $action->runtime_state['ceiling']);
        $this->assertSame(StopReason::LowChance->value, (new ActionResource($action))->toArray()['result']['progress']['stop_reason']);
    }

    public function test_overdue_processing_matches_individual_checkpoints(): void
    {
        $runner = new ScanRunner();
        $config = ['trials' => 1, 'seed' => 'catchup-scan', 'distance_ly' => 2.416];
        $regular = $runner->run($config);
        $overdue = $runner->run($config + ['catch_up' => true]);
        $this->assertSame($regular['runs'], $overdue['runs']);
    }
}
