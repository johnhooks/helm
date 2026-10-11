<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\ShipLink\Actions\ScanRoute\Resolver;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\Lib\Date;
use Helm\ShipLink\Resources\ActionResource;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Actions\ScanRoute\Resolver
 * @property WpunitTester $tester
 */
class ResolverTest extends WPTestCase
{
    private function scenario(): array
    {
        $simulation = $this->tester->haveSimulation('phase-handler');
        $this->tester->haveSimulationNode(0);
        $this->tester->haveSimulationNode(0.5);
        $ship = $this->tester->haveSimulationShip('Explorer', 1);
        $action = $simulation->dispatch($ship->getId(), ActionType::ScanRoute, ['target_node_id' => 2]);
        return [$simulation, $ship, $action];
    }

    public function test_early_or_final_actions_do_not_charge_or_advance(): void
    {
        [$simulation, $ship, $action] = $this->scenario();
        $before = $action->runtime_state;
        $core = $ship->power()->getCoreLife();
        $handler = helm(Resolver::class);
        $handler->handle($action, $ship);
        $this->assertSame($before, $action->runtime_state);
        $action->fulfill();
        Date::setTestNow($action->deferred_until);
        $handler->handle($action, $ship);
        $this->assertSame($before, $action->runtime_state);
        $this->assertSame($core, $ship->power()->getCoreLife());
    }

    public function test_invalid_origin_fails_before_charging(): void
    {
        [$simulation, $ship, $action] = $this->scenario();
        $action->params = [...$action->params, 'from_node_id' => 99];
        $core = $ship->power()->getCoreLife();
        $simulation->advanceToNextCheckpoint();
        $this->assertSame(ActionStatus::Failed, $action->status);
        $this->assertSame($core, $ship->power()->getCoreLife());
    }

    public function test_missing_runtime_state_fails_before_charging(): void
    {
        [$simulation, $ship, $action] = $this->scenario();
        $action->runtime_state = null;
        $core = $ship->power()->getCoreLife();
        $simulation->advanceToNextCheckpoint();
        $this->assertSame(ActionStatus::Failed, $action->status);
        $this->assertSame($core, $ship->power()->getCoreLife());
    }

    public function test_cycle_limit_stops_before_another_charge(): void
    {
        [$simulation, $ship, $action] = $this->scenario();
        $state = $action->runtime_state;
        $state['completed'] = $action->runtime_state['maxCycles'];
        $action->runtime_state = $state;
        $core = $ship->power()->getCoreLife();
        $simulation->advanceToNextCheckpoint();
        $this->assertSame(ActionStatus::Fulfilled, $action->status);
        $this->assertSame('cycle_limit_reached', (new ActionResource($action))->toArray()['result']['progress']['stop_reason']);
        $this->assertSame($core, $ship->power()->getCoreLife());
    }
}
