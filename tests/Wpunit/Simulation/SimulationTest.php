<?php

declare(strict_types=1);

namespace Tests\Wpunit\Simulation;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Navigation\NodeType;
use Helm\ShipLink\ActionStatus;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Contracts\ActionRepository;
use Helm\ShipLink\Contracts\ShipStateRepository;
use Helm\ShipLink\Ship;
use Helm\Simulation\Simulation;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * End-to-end simulation tests.
 *
 * Proves the game loop works without database I/O by using
 * in-memory repositories for all state.
 *
 * @covers \Helm\Simulation\Simulation
 * @covers \Helm\Simulation\Provider
 */
class SimulationTest extends WPTestCase
{
    private Simulation $sim;

    public function set_up(): void
    {
        parent::set_up();

        // Register the simulation provider — overrides all Wpdb* bindings
        $provider = new \Helm\Simulation\Provider(helm());
        $provider->register();
        $provider->boot();

        // Freeze time
        Date::setTestNow('2300-01-01 00:00:00');

        // Seed a minimal graph: two nodes close enough for direct jump (< 1 ly)
        $nodeRepo = helm(NodeRepository::class);
        $nodeRepo->create(0.0, 0.0, 0.0, NodeType::System);  // Node 1 (Sol)
        $nodeRepo->create(0.5, 0.3, 0.1, NodeType::System);  // Node 2 (nearby)

        $this->sim = helm(Simulation::class);
    }

    public function tear_down(): void
    {
        Date::setTestNow(null);
        parent::tear_down();
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

        $this->assertGreaterThan(0.0, $ship->power()->getOutput());
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
        $resolved = helm(ActionRepository::class)->find($action->id);
        $this->assertSame(ActionStatus::Fulfilled, $resolved->status);

        // Result should contain scan data
        $this->assertNotNull($resolved->result);
        $this->assertTrue($resolved->result['success']);
        $this->assertGreaterThan(0, $resolved->result['edges_discovered']);

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
}
