<?php

declare(strict_types=1);

namespace Tests\Wpunit\Navigation;

use Helm\Core\ErrorCode;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\JumpResult;
use Helm\Navigation\NavigationService;
use Helm\Navigation\Node;
use Helm\Navigation\NodeRepository;
use Helm\Ships\Ship;
use Helm\Ships\ShipRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\Navigation\NavigationService
 * @covers \Helm\Navigation\JumpResult
 *
 * @property WpunitTester $tester
 */
class NavigationServiceTest extends WPTestCase
{
    private NavigationService $service;
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;
    private ShipRepository $shipRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->service = helm(NavigationService::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
        $this->shipRepository = helm(ShipRepository::class);
    }

    public function test_jump_succeeds_with_valid_edge(): void
    {
        // Create two nodes
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        // Create edge between them (3 ly)
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 3.0);

        // Create ship at node A with enough fuel
        $ship = $this->tester->haveShip([
            'id' => 'jump-test',
            'nodeId' => $nodeA->id,
            'fuel' => 50.0,
            'driveRange' => 7.0,
        ]);

        $result = $this->service->jump($ship, $nodeB->id);

        $this->assertInstanceOf(JumpResult::class, $result);
        $this->assertSame($nodeB->id, $result->ship->nodeId);
        $this->assertGreaterThan(0, $result->fuelUsed);
        $this->assertSame(3.0, $result->distance);
    }

    public function test_jump_fails_without_edge(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        // No edge created
        $ship = $this->tester->haveShip([
            'id' => 'no-edge-test',
            'nodeId' => $nodeA->id,
        ]);

        $result = $this->service->jump($ship, $nodeB->id);

        $this->assertInstanceOf(\WP_Error::class, $result);
        $this->assertTrue(ErrorCode::NavigationNoRoute->matches($result));
        $this->assertSame('No known route to target', $result->get_error_message());
    }

    public function test_jump_fails_beyond_drive_range(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 10.0, y: 0.0, z: 0.0);

        // Edge exists but is 10 ly
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 10.0);

        // Ship only has 7 ly range
        $ship = $this->tester->haveShip([
            'id' => 'range-test',
            'nodeId' => $nodeA->id,
            'driveRange' => 7.0,
        ]);

        $result = $this->service->jump($ship, $nodeB->id);

        $this->assertInstanceOf(\WP_Error::class, $result);
        $this->assertTrue(ErrorCode::NavigationBeyondRange->matches($result));
    }

    public function test_jump_fails_with_insufficient_fuel(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 5.0, y: 0.0, z: 0.0);

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 5.0);

        // Ship has very low fuel
        $ship = $this->tester->haveShip([
            'id' => 'fuel-test',
            'nodeId' => $nodeA->id,
            'fuel' => 1.0,
            'driveRange' => 7.0,
        ]);

        $result = $this->service->jump($ship, $nodeB->id);

        $this->assertInstanceOf(\WP_Error::class, $result);
        $this->assertTrue(ErrorCode::NavigationInsufficientFuel->matches($result));

        // Check additional data
        $data = $result->get_error_data();
        $this->assertArrayHasKey('required', $data);
        $this->assertArrayHasKey('available', $data);
    }

    public function test_jump_consumes_fuel(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 3.0);

        $initialFuel = 100.0;
        $ship = $this->tester->haveShip([
            'id' => 'fuel-consume-test',
            'nodeId' => $nodeA->id,
            'fuel' => $initialFuel,
            'driveRange' => 7.0,
        ]);

        $result = $this->service->jump($ship, $nodeB->id);

        $this->assertInstanceOf(JumpResult::class, $result);
        $this->assertLessThan($initialFuel, $result->ship->fuel);
        $this->assertEqualsWithDelta($result->fuelUsed, $initialFuel - $result->ship->fuel, 0.0001);
    }

    public function test_jump_persists_ship_state(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 3.0);

        $ship = $this->tester->haveShip([
            'id' => 'persist-test',
            'nodeId' => $nodeA->id,
            'fuel' => 100.0,
        ]);

        $this->service->jump($ship, $nodeB->id);

        // Reload from database
        $reloaded = $this->shipRepository->get('persist-test');

        $this->assertSame($nodeB->id, $reloaded->nodeId);
        $this->assertLessThan(100.0, $reloaded->fuel);
    }

    public function test_get_reachable_nodes_returns_connected_nodes(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);
        $nodeC = $this->nodeRepository->create(x: 0.0, y: 5.0, z: 0.0);
        $nodeD = $this->nodeRepository->create(x: 20.0, y: 0.0, z: 0.0); // Disconnected

        // Connect A to B and C
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 3.0);
        $this->edgeRepository->create($nodeA->id, $nodeC->id, 5.0);

        $ship = $this->tester->haveShip([
            'id' => 'reachable-test',
            'nodeId' => $nodeA->id,
            'driveRange' => 7.0,
        ]);

        $reachable = $this->service->getReachableNodes($ship);

        $reachableIds = array_map(fn(Node $n) => $n->id, $reachable);

        $this->assertContains($nodeB->id, $reachableIds);
        $this->assertContains($nodeC->id, $reachableIds);
        $this->assertNotContains($nodeD->id, $reachableIds);
    }

    public function test_get_reachable_nodes_respects_drive_range(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);
        $nodeC = $this->nodeRepository->create(x: 10.0, y: 0.0, z: 0.0);

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 3.0);
        $this->edgeRepository->create($nodeA->id, $nodeC->id, 10.0);

        // Ship with 5 ly range
        $ship = $this->tester->haveShip([
            'id' => 'range-reachable-test',
            'nodeId' => $nodeA->id,
            'driveRange' => 5.0,
        ]);

        $reachable = $this->service->getReachableNodes($ship);

        $reachableIds = array_map(fn(Node $n) => $n->id, $reachable);

        $this->assertContains($nodeB->id, $reachableIds);
        $this->assertNotContains($nodeC->id, $reachableIds); // Beyond range
    }

    public function test_get_reachable_with_fuel_respects_fuel(): void
    {
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 1.0, y: 0.0, z: 0.0);
        $nodeC = $this->nodeRepository->create(x: 5.0, y: 0.0, z: 0.0);

        $this->edgeRepository->create($nodeA->id, $nodeB->id, 1.0);
        $this->edgeRepository->create($nodeA->id, $nodeC->id, 5.0);

        // Ship with very low fuel
        $ship = $this->tester->haveShip([
            'id' => 'fuel-reachable-test',
            'nodeId' => $nodeA->id,
            'fuel' => 5.0, // Only enough for short jump
            'driveRange' => 7.0,
        ]);

        $reachable = $this->service->getReachableWithFuel($ship);

        $reachableIds = array_map(fn(Node $n) => $n->id, $reachable);

        $this->assertContains($nodeB->id, $reachableIds);
        $this->assertNotContains($nodeC->id, $reachableIds); // Not enough fuel
    }

    public function test_calculate_fuel_cost(): void
    {
        $cost1 = $this->service->calculateFuelCost(distance: 3.0, driveRange: 7.0);
        $cost2 = $this->service->calculateFuelCost(distance: 3.0, driveRange: 10.0);

        // Same distance, better drive = less fuel
        $this->assertLessThan($cost1, $cost2);

        // Longer distance = more fuel
        $cost3 = $this->service->calculateFuelCost(distance: 5.0, driveRange: 7.0);
        $this->assertGreaterThan($cost1, $cost3);
    }

    public function test_jump_fails_for_invalid_current_node(): void
    {
        $targetNode = $this->nodeRepository->create(x: 3.0, y: 0.0, z: 0.0);

        $ship = $this->tester->haveShip([
            'id' => 'invalid-node-test',
            'nodeId' => 99999, // Non-existent
        ]);

        $result = $this->service->jump($ship, $targetNode->id);

        $this->assertInstanceOf(\WP_Error::class, $result);
        $this->assertTrue(ErrorCode::NavigationInvalidNode->matches($result));
    }

    public function test_jump_fails_for_invalid_target_node(): void
    {
        $currentNode = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);

        $ship = $this->tester->haveShip([
            'id' => 'invalid-target-test',
            'nodeId' => $currentNode->id,
        ]);

        $result = $this->service->jump($ship, 99999);

        $this->assertInstanceOf(\WP_Error::class, $result);
        $this->assertTrue(ErrorCode::NavigationInvalidTarget->matches($result));
    }
}
