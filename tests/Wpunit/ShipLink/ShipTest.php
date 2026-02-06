<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NodeRepository;
use Helm\ShipLink\Models\Action;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\Loadout;
use Helm\ShipLink\Models\ShipState;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\ShipStateRepository;
use Helm\ShipLink\ShipComponentRepository;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Ship
 *
 * @property WpunitTester $tester
 */
class ShipTest extends WPTestCase
{
    private ShipFactory $factory;
    private ShipStateRepository $stateRepository;
    private ShipComponentRepository $componentRepository;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->factory = helm(ShipFactory::class);
        $this->stateRepository = helm(ShipStateRepository::class);
        $this->componentRepository = helm(ShipComponentRepository::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function test_get_state_returns_ship_state(): void
    {
        $shipPost = $this->tester->haveShip();
        $ship = $this->factory->build($shipPost->postId());

        $this->assertInstanceOf(ShipState::class, $ship->getState());
    }

    public function test_get_loadout_returns_loadout(): void
    {
        $shipPost = $this->tester->haveShip();
        $ship = $this->factory->build($shipPost->postId());

        $this->assertInstanceOf(Loadout::class, $ship->getLoadout());
    }

    public function test_get_id_returns_post_id(): void
    {
        $shipPost = $this->tester->haveShip();
        $ship = $this->factory->build($shipPost->postId());

        $this->assertSame($shipPost->postId(), $ship->getId());
    }

    public function test_get_owner_id_returns_owner(): void
    {
        $shipPost = $this->tester->haveShip(['ownerId' => 456]);
        $ship = $this->factory->build($shipPost->postId());

        $this->assertSame(456, $ship->getOwnerId());
    }

    public function test_process_fails_when_destroyed(): void
    {
        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->hull_integrity = 0.0;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Jump, 'params' => []]);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('ship');
        $this->assertInstanceOf(\WP_Error::class, $error);
        $this->assertSame('ship_destroyed', $error->get_error_code());
    }

    public function test_process_fails_when_core_depleted(): void
    {
        $shipPost = $this->tester->haveShip(['core_life' => 0]);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Jump, 'params' => []]);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('power');
        $this->assertInstanceOf(\WP_Error::class, $error);
        $this->assertSame('core_depleted', $error->get_error_code());
    }

    public function test_can_process_returns_false_when_destroyed(): void
    {
        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->hull_integrity = 0.0;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Jump, 'params' => []]);

        $this->assertFalse($ship->canProcess($action));
    }

    public function test_process_jump_succeeds(): void
    {
        // Create nodes and edge for the jump
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 5.0, y: 0.0, z: 0.0);
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 5.0);

        $shipPost = $this->tester->haveShip(['core_life' => 100]);

        $state = $this->stateRepository->find($shipPost->postId());
        $state->node_id = $nodeA->id;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Jump, 'params' => ['target_node_id' => $nodeB->id]]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $jumpResult = $result->get('jump');
        $this->assertNotNull($jumpResult);
        $this->assertSame(5.0, $jumpResult->get('distance'));
        $this->assertSame($nodeB->id, $ship->getState()->node_id);
    }

    public function test_process_jump_consumes_core_life(): void
    {
        // Create nodes and edge within range
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 5.0, y: 0.0, z: 0.0);
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 5.0);

        // Default loadout: Epoch-S (1.0x jump cost), DR-505 (1.0x consumption)
        $shipPost = $this->tester->haveShip(['core_life' => 100]);

        $state = $this->stateRepository->find($shipPost->postId());
        $state->node_id = $nodeA->id;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Jump, 'params' => ['target_node_id' => $nodeB->id]]);
        $ship->process($action);

        // 5 * 1.0 * 1.0 = 5 core consumed → 100 - 5 = 95
        $this->assertSame(95, $ship->getLoadout()->core()->life());
    }

    public function test_process_jump_fails_without_route(): void
    {
        // Create nodes but NO edge
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 10.0, y: 0.0, z: 0.0);

        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->node_id = $nodeA->id;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Jump, 'params' => ['target_node_id' => $nodeB->id]]);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('navigation');
        $this->assertInstanceOf(\WP_Error::class, $error);
    }

    public function test_process_jump_fails_insufficient_core_life(): void
    {
        // Create nodes and edge within range but requiring more core than available
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 5.0, y: 0.0, z: 0.0);
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 5.0);

        $shipPost = $this->tester->haveShip(['core_life' => 1]); // Not enough for 5 ly jump

        $state = $this->stateRepository->find($shipPost->postId());
        $state->node_id = $nodeA->id;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Jump, 'params' => ['target_node_id' => $nodeB->id]]);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('power');
        $this->assertInstanceOf(\WP_Error::class, $error);
        $this->assertSame('insufficient_core_life', $error->get_error_code());
    }

    public function test_process_scan_route_succeeds(): void
    {
        // Default loadout: VRS Mk I (5 ly range)
        $shipPost = $this->tester->haveShip();

        $state = $this->stateRepository->find($shipPost->postId());
        $state->power_full_at = new DateTimeImmutable('-1 hour'); // Full power
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::ScanRoute, 'params' => ['distance' => 4.0]]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $scanResult = $result->get('scan');
        $this->assertNotNull($scanResult);
    }

    public function test_process_scan_route_fails_out_of_range(): void
    {
        // Default loadout: VRS Mk I (5 ly range) - 10 ly is out of range
        $shipPost = $this->tester->haveShip();

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::ScanRoute, 'params' => ['distance' => 10.0]]);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('sensors');
        $this->assertSame('out_of_range', $error->get_error_code());
    }

    public function test_process_repair_increases_hull(): void
    {
        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->hull_integrity = 50.0;
        $state->hull_max = 100.0;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Repair, 'params' => ['amount' => 25.0]]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $this->assertSame(75.0, $ship->getState()->hull_integrity);
    }

    public function test_process_transfer_adds_cargo(): void
    {
        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->cargo = [];
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Transfer, 'params' => [
            'resource' => 'ore',
            'quantity' => 50,
            'direction' => 'load',
        ]]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $this->assertSame(50, $ship->cargo()->quantity('ore'));
    }

    public function test_process_transfer_removes_cargo(): void
    {
        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->cargo = ['ore' => 100];
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $action = new Action(['type' => ActionType::Transfer, 'params' => [
            'resource' => 'ore',
            'quantity' => 30,
            'direction' => 'unload',
        ]]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $this->assertSame(70, $ship->cargo()->quantity('ore'));
    }

    public function test_power_system_reports_current_power(): void
    {
        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->power_full_at = new DateTimeImmutable('-1 hour');
        $state->power_max = 100.0;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $this->assertSame(100.0, $ship->power()->getCurrentPower());
        $this->assertSame(100.0, $ship->power()->getMaxPower());
    }

    public function test_shields_system_reports_current_strength(): void
    {
        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->shields_full_at = new DateTimeImmutable('-1 hour');
        $state->shields_max = 100.0;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $this->assertSame(100.0, $ship->shields()->getCurrentStrength());
    }

    public function test_hull_system_reports_integrity(): void
    {
        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->hull_integrity = 75.0;
        $state->hull_max = 100.0;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $this->assertSame(75.0, $ship->hull()->getIntegrity());
        $this->assertSame(0.75, $ship->hull()->getIntegrityPercent());
    }

    public function test_navigation_reports_position(): void
    {
        $node = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);

        $shipPost = $this->tester->haveShip();
        $state = $this->stateRepository->find($shipPost->postId());
        $state->node_id = $node->id;
        $this->stateRepository->update($state);

        $ship = $this->factory->build($shipPost->postId());

        $this->assertSame($node->id, $ship->navigation()->getCurrentPosition());
    }
}
