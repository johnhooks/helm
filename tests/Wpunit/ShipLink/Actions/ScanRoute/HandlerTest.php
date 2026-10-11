<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\Lib\Date;
use Helm\ShipLink\Resources\ActionResource;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Handler
 * @property WpunitTester $tester
 */
class HandlerTest extends WPTestCase
{
    public function test_initializes_work_and_equipment_derived_state_without_charging(): void
    {
        $this->tester->haveSimulation();
        $origin = $this->tester->haveSimulationNode(0);
        $target = $this->tester->haveSimulationNode(1);
        $ship = $this->tester->haveSimulationShip('Explorer', 1, $origin->id);
        $core = $ship->power()->getCoreLife();
        $action = $this->tester->dispatchSimulationAction($ship->getId(), ActionType::ScanRoute, [
            'target_node_id' => $target->id,
            'cycle_seconds' => 1, 'core_cost' => 0, 'core_budget' => 99999,
            'work_gain' => 99999, 'skill' => 99, 'sensor_range' => 99999,
            'sensor_quality' => 99, 'initial_distance' => 0,
            'min_ceiling' => 0, 'max_cycles' => 99999,
        ]);
        $this->assertSame(ActionStatus::Pending, $action->status);
        $this->assertArrayNotHasKey('profile', $action->runtime_state);
        $this->assertSame(['from_node_id', 'target_node_id'], array_keys($action->params));
        $this->assertSame(420, $action->runtime_state['cycleSeconds']);
        $this->assertSame(1.0, $action->runtime_state['powerCost']);
        $this->assertSame(0.5, $action->runtime_state['workGain']);
        $this->assertSame($ship->navigation()->getSkill(), $action->runtime_state['skill']);
        $this->assertSame($ship->sensors()->getRange(), $action->runtime_state['sensorRange']);
        $this->assertSame($ship->sensors()->getScanSuccessChance(), $action->runtime_state['sensorQuality']);
        $this->assertSame(1.0, $action->runtime_state['initialDistance']);
        $this->assertSame(0.12, $action->runtime_state['minCeiling']);
        $this->assertSame(720, $action->runtime_state['maxCycles']);
        $this->assertSame(0, $action->runtime_state['completed']);
        $this->assertArrayNotHasKey('history', (new ActionResource($action))->toArray()['result']['progress']);
        $this->assertSame(420, (new ActionResource($action))->toArray()['result']['progress']['cycle_seconds']);
        $this->assertSame(Date::now()->getTimestamp() + 420, $action->deferred_until->getTimestamp());
        $this->assertSame($core, $ship->power()->getCoreLife());
    }
}
