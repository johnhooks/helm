<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\Navigation\EdgeRepository;
use Helm\Navigation\NodeRepository;
use Helm\ShipLink\Action;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\ShipLink\Contracts\ShipLink;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\ShipModel;
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
    private NodeRepository $nodeRepository;
    private EdgeRepository $edgeRepository;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->factory = helm(ShipFactory::class);
        $this->nodeRepository = helm(NodeRepository::class);
        $this->edgeRepository = helm(EdgeRepository::class);
    }

    public function test_get_model_returns_model(): void
    {
        $model = $this->createModel();
        $ship = $this->createShip($model);

        $this->assertSame($model, $ship->getModel());
    }

    public function test_get_id_returns_post_id(): void
    {
        $model = $this->createModel();
        $model->postId = 123;
        $ship = $this->createShip($model);

        $this->assertSame(123, $ship->getId());
    }

    public function test_get_owner_id_returns_owner(): void
    {
        $model = $this->createModel();
        $model->ownerId = 456;
        $ship = $this->createShip($model);

        $this->assertSame(456, $ship->getOwnerId());
    }

    public function test_process_fails_when_destroyed(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 0.0;
        $ship = $this->createShip($model);

        $action = new Action(ActionType::Jump, []);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('ship');
        $this->assertInstanceOf(\WP_Error::class, $error);
        $this->assertSame('ship_destroyed', $error->get_error_code());
    }

    public function test_process_fails_when_core_depleted(): void
    {
        $model = $this->createModel();
        $model->coreLife = 0.0;
        $ship = $this->createShip($model);

        $action = new Action(ActionType::Jump, []);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('power');
        $this->assertInstanceOf(\WP_Error::class, $error);
        $this->assertSame('core_depleted', $error->get_error_code());
    }

    public function test_can_process_returns_false_when_destroyed(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 0.0;
        $ship = $this->createShip($model);

        $action = new Action(ActionType::Jump, []);

        $this->assertFalse($ship->canProcess($action));
    }

    public function test_process_jump_succeeds(): void
    {
        // Create nodes and edge for the jump
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 5.0, y: 0.0, z: 0.0);
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 5.0);

        $model = $this->createModel();
        $model->coreLife = 100.0;
        $model->nodeId = $nodeA->id;
        $ship = $this->createShip($model);

        $action = Action::jump($nodeB->id);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $jumpResult = $result->get('jump');
        $this->assertNotNull($jumpResult);
        $this->assertSame(5.0, $jumpResult->get('distance'));
        $this->assertSame($nodeB->id, $ship->getModel()->nodeId);
    }

    public function test_process_jump_consumes_core_life(): void
    {
        // Create nodes and edge within DR-5 range (max ~7 ly)
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 5.0, y: 0.0, z: 0.0);
        $this->edgeRepository->create($nodeA->id, $nodeB->id, 5.0);

        $model = $this->createModel();
        $model->coreType = CoreType::EpochS; // 1.0x jump cost
        $model->driveType = DriveType::DR5; // 1.0x consumption
        $model->coreLife = 100.0;
        $model->nodeId = $nodeA->id;
        $ship = $this->createShip($model);

        $action = Action::jump($nodeB->id);
        $ship->process($action);

        // 5 * 1.0 * 1.0 = 5 core consumed
        $this->assertSame(95.0, $ship->getModel()->coreLife);
    }

    public function test_process_jump_fails_without_route(): void
    {
        // Create nodes but NO edge
        $nodeA = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);
        $nodeB = $this->nodeRepository->create(x: 10.0, y: 0.0, z: 0.0);

        $model = $this->createModel();
        $model->nodeId = $nodeA->id;
        $ship = $this->createShip($model);

        $action = Action::jump($nodeB->id);
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

        $model = $this->createModel();
        $model->coreLife = 1.0; // Not enough for 5 ly jump (costs 5 core)
        $model->nodeId = $nodeA->id;
        $ship = $this->createShip($model);

        $action = Action::jump($nodeB->id);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('power');
        $this->assertInstanceOf(\WP_Error::class, $error);
        $this->assertSame('insufficient_core_life', $error->get_error_code());
    }

    public function test_process_scan_route_succeeds(): void
    {
        $model = $this->createModel();
        $model->sensorType = SensorType::VRS; // 12 ly range
        $model->powerFullAt = new DateTimeImmutable('-1 hour'); // Full power
        $ship = $this->createShip($model);

        $action = new Action(ActionType::ScanRoute, ['distance' => 5.0]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $scanResult = $result->get('scan');
        $this->assertNotNull($scanResult);
    }

    public function test_process_scan_route_fails_out_of_range(): void
    {
        $model = $this->createModel();
        $model->sensorType = SensorType::ACU; // Only 6 ly range
        $ship = $this->createShip($model);

        $action = new Action(ActionType::ScanRoute, ['distance' => 10.0]);
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('sensors');
        $this->assertSame('out_of_range', $error->get_error_code());
    }

    public function test_process_repair_increases_hull(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 50.0;
        $model->hullMax = 100.0;
        $ship = $this->createShip($model);

        $action = new Action(ActionType::Repair, ['amount' => 25.0]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $this->assertSame(75.0, $ship->getModel()->hullIntegrity);
    }

    public function test_process_transfer_adds_cargo(): void
    {
        $model = $this->createModel();
        $model->cargo = [];
        $ship = $this->createShip($model);

        $action = new Action(ActionType::Transfer, [
            'resource' => 'ore',
            'quantity' => 50,
            'direction' => 'load',
        ]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $this->assertSame(50, $ship->getModel()->cargoQuantity('ore'));
    }

    public function test_process_transfer_removes_cargo(): void
    {
        $model = $this->createModel();
        $model->cargo = ['ore' => 100];
        $ship = $this->createShip($model);

        $action = new Action(ActionType::Transfer, [
            'resource' => 'ore',
            'quantity' => 30,
            'direction' => 'unload',
        ]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $this->assertSame(70, $ship->getModel()->cargoQuantity('ore'));
    }

    public function test_power_system_reports_current_power(): void
    {
        $model = $this->createModel();
        $model->powerFullAt = new DateTimeImmutable('-1 hour');
        $model->powerMax = 100.0;
        $ship = $this->createShip($model);

        $this->assertSame(100.0, $ship->power()->getCurrentPower());
        $this->assertSame(100.0, $ship->power()->getMaxPower());
    }

    public function test_shields_system_reports_current_strength(): void
    {
        $model = $this->createModel();
        $model->shieldsFullAt = new DateTimeImmutable('-1 hour');
        $model->shieldsMax = 100.0;
        $ship = $this->createShip($model);

        $this->assertSame(100.0, $ship->shields()->getCurrentStrength());
    }

    public function test_hull_system_reports_integrity(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 75.0;
        $model->hullMax = 100.0;
        $ship = $this->createShip($model);

        $this->assertSame(75.0, $ship->hull()->getIntegrity());
        $this->assertSame(0.75, $ship->hull()->getIntegrityPercent());
    }

    public function test_navigation_reports_position(): void
    {
        $node = $this->nodeRepository->create(x: 0.0, y: 0.0, z: 0.0);

        $model = $this->createModel();
        $model->nodeId = $node->id;
        $ship = $this->createShip($model);

        $this->assertSame($node->id, $ship->navigation()->getCurrentPosition());
    }

    /**
     * Create a Ship from a model using the factory.
     */
    private function createShip(ShipModel $model): ShipLink
    {
        return $this->factory->buildFromModel($model);
    }

    /**
     * Create a basic model for testing.
     */
    private function createModel(): ShipModel
    {
        $model = new ShipModel();
        $model->postId = 1;
        $model->name = 'Test Ship';
        $model->ownerId = 1;
        $model->coreType = CoreType::EpochS;
        $model->driveType = DriveType::DR5;
        $model->sensorType = SensorType::VRS;
        $model->shieldType = ShieldType::Beta;
        $model->navTier = NavTier::Tier1;
        $model->powerMode = PowerMode::Normal;
        $model->powerFullAt = new DateTimeImmutable();
        $model->powerMax = 100.0;
        $model->shieldsFullAt = new DateTimeImmutable();
        $model->shieldsMax = 100.0;
        $model->coreLife = 750.0;
        $model->hullIntegrity = 100.0;
        $model->hullMax = 100.0;
        $model->nodeId = null;
        $model->cargo = [];
        $model->currentActionId = null;
        $model->createdAt = new DateTimeImmutable();
        $model->updatedAt = new DateTimeImmutable();

        return $model;
    }
}
