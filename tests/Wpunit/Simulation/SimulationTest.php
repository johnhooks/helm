<?php

declare(strict_types=1);

namespace Tests\Wpunit\Simulation;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\NodeType;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Ship;
use Helm\Simulation\Simulation;
use Tests\Support\WpunitTester;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * End-to-end simulation tests.
 *
 * Proves the game loop works without database I/O by using
 * in-memory repositories for all state.
 *
 * @property WpunitTester $tester
 *
 * @covers \Helm\Simulation\Simulation
 * @covers \Helm\Simulation\Provider
 */
class SimulationTest extends WPTestCase
{
    private Simulation $sim;

    public function _before(): void
    {
        parent::_before();
        $this->sim = $this->tester->haveSimulation();
        $this->tester->haveSimulationNode(0.0);
        $this->tester->haveSimulationNode(0.5, 0.3, 0.1);
    }

    public function test_create_ship(): void
    {
        $ship = $this->sim->createShip('Test Ship', 1);

        $this->assertInstanceOf(Ship::class, $ship);
        $this->assertSame('Test Ship', $ship->getName());
        $this->assertSame(1, $ship->getId());
    }

    public function test_ship_has_default_loadout(): void
    {
        $ship = $this->sim->createShip('Loadout Ship', 1);

        $this->assertSame('epoch_s', $ship->getLoadout()->core()->slug());
        $this->assertSame('dr_505', $ship->getLoadout()->drive()->slug());
        $this->assertSame('vrs_mk1', $ship->getLoadout()->sensor()->slug());
        $this->assertSame('aegis_delta', $ship->getLoadout()->shield()->slug());
        $this->assertSame('nav_tier_1', $ship->getLoadout()->nav()->slug());
    }

    public function test_ship_starts_at_origin(): void
    {
        $ship = $this->sim->createShip('Origin Ship', 1);

        $this->assertSame(1, $ship->navigation()->getCurrentPosition());
    }

    public function test_ship_has_full_power(): void
    {
        $ship = $this->sim->createShip('Power Ship', 1);

        $this->assertGreaterThan(0.0, $ship->power()->getCurrentPower());
    }

    public function test_rebuild_ship_from_state(): void
    {
        $ship = $this->sim->createShip('Rebuild Ship', 1);
        $postId = $ship->getId();

        $rebuilt = $this->sim->getShip($postId);

        $this->assertSame($postId, $rebuilt->getId());
        $this->assertSame('Rebuild Ship', $rebuilt->getName());
        $this->assertSame('epoch_s', $rebuilt->getLoadout()->core()->slug());
    }

    public function test_scan_route_deferred_action(): void
    {
        $ship = $this->sim->createShip('Scanner', 1);

        // Dispatch scan_route to nearby node
        $action = $this->sim->dispatch($ship->getId(), ActionType::ScanRoute, [
            'target_node_id' => 2,
        ]);

        // Action should be pending with a deferred time
        $this->assertSame(ActionStatus::Pending, $action->status);
        $this->assertNotNull($action->deferred_until);
        $this->assertNotNull($action->id);

        // Ship should have current_action_id set
        $state = helm(ShipStateRepository::class)->find($ship->getId());
        $this->assertSame($action->id, $state->current_action_id);
    }

    public function test_scan_route_resolves_after_time(): void
    {
        $ship = $this->sim->createShip('Time Scanner', 1);

        $action = $this->sim->dispatch($ship->getId(), ActionType::ScanRoute, [
            'target_node_id' => 2,
        ]);

        // Calculate how far to advance (scan duration + 1 second buffer)
        $deferredUntil = $action->deferred_until;
        $now = Date::now();
        $secondsToAdvance = $deferredUntil->getTimestamp() - $now->getTimestamp() + 1;

        // Advance time past deferred_until
        $result = $this->sim->advance($secondsToAdvance);

        $this->assertSame(1, $result->processed);
        $this->assertSame(0, $result->failed);

        // Reload action — should be fulfilled
        $resolved = $this->sim->findAction($action->id);
        $this->assertSame(ActionStatus::Fulfilled, $resolved->status);

        // Result should contain the public route data
        $this->assertNotNull($resolved->result);
        $this->assertNotEmpty($resolved->result['discovered_edge_ids']);
        $this->assertNotEmpty($resolved->result['path']);

        // Ship should have current_action_id cleared
        $state = helm(ShipStateRepository::class)->find($ship->getId());
        $this->assertNull($state->current_action_id);
    }

    public function test_multiple_ships(): void
    {
        $ship1 = $this->sim->createShip('Alpha', 1);
        $ship2 = $this->sim->createShip('Beta', 2);

        $this->assertSame(1, $ship1->getId());
        $this->assertSame(2, $ship2->getId());
        $this->assertSame('Alpha', $ship1->getName());
        $this->assertSame('Beta', $ship2->getName());
    }

    public function test_create_ship_at_node(): void
    {
        $ship = $this->sim->createShipAtNode('Explorer', 1, 2);

        $this->assertSame(2, $ship->navigation()->getCurrentPosition());
        $this->assertSame('Explorer', $ship->getName());
    }

    public function test_advance_until_idle_resolves_action(): void
    {
        $ship = $this->sim->createShip('Idle Scanner', 1);

        $action = $this->sim->dispatch($ship->getId(), ActionType::ScanRoute, [
            'target_node_id' => 2,
        ]);

        $this->assertSame(ActionStatus::Pending, $action->status);

        // advanceUntilIdle should jump clock and process without manual calculation
        $result = $this->sim->advanceUntilIdle();

        $this->assertSame(1, $result->processed);
        $this->assertSame(0, $result->failed);

        $resolved = $this->sim->findAction($action->id);
        $this->assertSame(ActionStatus::Fulfilled, $resolved->status);
    }

    public function test_advance_until_idle_scan_then_jump(): void
    {
        $ship = $this->sim->createShip('Full Loop', 1);

        // Scan for route to node 2
        $scan = $this->sim->dispatch($ship->getId(), ActionType::ScanRoute, [
            'target_node_id' => 2,
        ]);
        $this->sim->advanceUntilIdle();

        $resolvedScan = $this->sim->findAction($scan->id);
        $this->assertSame(ActionStatus::Fulfilled, $resolvedScan->status);
        $this->assertNotEmpty($resolvedScan->result['discovered_edge_ids']);

        // Now jump to node 2
        $jump = $this->sim->dispatch($ship->getId(), ActionType::Jump, [
            'from_node_id' => 1,
            'target_node_id' => 2,
            'route' => $resolvedScan->result['discovered_edge_ids'],
        ]);
        $this->sim->advanceUntilIdle();

        $resolvedJump = $this->sim->findAction($jump->id);
        $this->assertSame(ActionStatus::Fulfilled, $resolvedJump->status);

        // Ship should now be at node 2
        $rebuilt = $this->sim->getShip($ship->getId());
        $this->assertSame(2, $rebuilt->navigation()->getCurrentPosition());
    }

    public function test_seed_graph(): void
    {
        // The set_up already seeds 2 nodes, but test the JSON seeder
        $nodeRepo = helm(NodeRepository::class);
        $edgeRepo = helm(EdgeRepository::class);

        // We already have 2 nodes from set_up
        $this->assertSame(2, $nodeRepo->count());

        // Verify nodes exist
        $node1 = $nodeRepo->get(1);
        $node2 = $nodeRepo->get(2);
        $this->assertNotNull($node1);
        $this->assertNotNull($node2);
        $this->assertSame(NodeType::System, $node1->type);
    }

    public function test_starting_a_new_simulation_resets_fixtures_clock_and_rolls(): void
    {
        $ship = $this->tester->haveSimulationShip();
        $this->tester->dispatchSimulationAction($ship->getId(), ActionType::ScanRoute, ['target_node_id' => 2]);
        $this->tester->advanceSimulationUntilIdle();
        $this->assertSame(1, helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->count(1));
        $this->tester->haveSimulationRolls(1.0);

        $this->tester->haveSimulation(startedAt: '2301-01-01 00:00:00');
        $this->assertSame('2301-01-01 00:00:00', Date::nowString());
        $this->assertSame(0, helm(NodeRepository::class)->count());
        $this->assertSame(0, helm(\Helm\Navigation\Contracts\UserEdgeRepository::class)->count(1));
        $this->assertSame(0, $this->tester->advanceSimulationToNextCheckpoint()->processed);
        $node = $this->tester->haveSimulationNode(3.0);
        $this->assertSame(1, $node->id);
        $this->assertSame($node, $this->tester->grabSimulationNode($node->id));
        $this->assertSame(1, $this->tester->haveSimulationShip()->getId());
        $source = helm(\Helm\Navigation\Contracts\RandomSource::class);
        $expected = new \Helm\Simulation\SimulationRandomSource('simulation-test');
        $this->assertSame($expected->next(), $source->next());
    }
}
