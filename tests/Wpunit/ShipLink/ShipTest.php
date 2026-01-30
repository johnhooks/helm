<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\Action;
use Helm\ShipLink\ActionType;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\ShipLink\Ship;
use Helm\ShipLink\ShipFactory;
use Helm\ShipLink\ShipModel;
use Helm\ShipLink\ShipSystemsRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Ship
 */
class ShipTest extends WPTestCase
{
    private ShipFactory $factory;

    public function _before(): void
    {
        parent::_before();
        $this->factory = new ShipFactory(new ShipSystemsRepository());
    }

    public function test_get_model_returns_model(): void
    {
        $model = $this->createModel();
        $ship = new Ship($model);

        $this->assertSame($model, $ship->getModel());
    }

    public function test_get_id_returns_post_id(): void
    {
        $model = $this->createModel();
        $model->postId = 123;
        $ship = new Ship($model);

        $this->assertSame(123, $ship->getId());
    }

    public function test_get_owner_id_returns_owner(): void
    {
        $model = $this->createModel();
        $model->ownerId = 456;
        $ship = new Ship($model);

        $this->assertSame(456, $ship->getOwnerId());
    }

    public function test_process_fails_when_destroyed(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 0.0;
        $ship = new Ship($model);

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
        $ship = new Ship($model);

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
        $ship = new Ship($model);

        $action = new Action(ActionType::Jump, []);

        $this->assertFalse($ship->canProcess($action));
    }

    public function test_process_jump_succeeds(): void
    {
        $model = $this->createModel();
        $model->coreLife = 100.0;
        $ship = new Ship($model);

        $action = new Action(ActionType::Jump, [
            'distance' => 5.0,
            'target_node_id' => 42,
        ]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $jumpResult = $result->get('jump');
        $this->assertNotNull($jumpResult);
        $this->assertSame(5.0, $jumpResult->get('distance'));
        $this->assertSame(42, $ship->getModel()->nodeId);
    }

    public function test_process_jump_consumes_core_life(): void
    {
        $model = $this->createModel();
        $model->coreType = CoreType::EpochS; // 1.0x jump cost
        $model->driveType = DriveType::DR5; // 1.0x decay
        $model->coreLife = 100.0;
        $ship = new Ship($model);

        $action = new Action(ActionType::Jump, ['distance' => 10.0]);
        $ship->process($action);

        // 10 * 1.0 * 1.0 = 10 core consumed
        $this->assertSame(90.0, $ship->getModel()->coreLife);
    }

    public function test_process_jump_fails_out_of_range(): void
    {
        $model = $this->createModel();
        $ship = new Ship($model);

        $action = new Action(ActionType::Jump, ['distance' => 100.0]); // Way beyond max
        $result = $ship->process($action);

        $this->assertTrue($result->hasErrors());
        $error = $result->get('propulsion');
        $this->assertSame('out_of_range', $error->get_error_code());
    }

    public function test_process_scan_route_succeeds(): void
    {
        $model = $this->createModel();
        $model->sensorType = SensorType::SRS; // 12 ly range
        $model->powerFullAt = new DateTimeImmutable('-1 hour'); // Full power
        $ship = new Ship($model);

        $action = new Action(ActionType::ScanRoute, ['distance' => 5.0]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $scanResult = $result->get('scan');
        $this->assertNotNull($scanResult);
    }

    public function test_process_scan_route_fails_out_of_range(): void
    {
        $model = $this->createModel();
        $model->sensorType = SensorType::SRH; // Only 6 ly range
        $ship = new Ship($model);

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
        $ship = new Ship($model);

        $action = new Action(ActionType::Repair, ['amount' => 25.0]);
        $result = $ship->process($action);

        $this->assertFalse($result->hasErrors());
        $this->assertSame(75.0, $ship->getModel()->hullIntegrity);
    }

    public function test_process_transfer_adds_cargo(): void
    {
        $model = $this->createModel();
        $model->cargo = [];
        $ship = new Ship($model);

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
        $ship = new Ship($model);

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
        $ship = new Ship($model);

        $this->assertSame(100.0, $ship->power()->getCurrentPower());
        $this->assertSame(100.0, $ship->power()->getMaxPower());
    }

    public function test_shields_system_reports_current_strength(): void
    {
        $model = $this->createModel();
        $model->shieldsFullAt = new DateTimeImmutable('-1 hour');
        $model->shieldsMax = 100.0;
        $ship = new Ship($model);

        $this->assertSame(100.0, $ship->shields()->getCurrentStrength());
    }

    public function test_hull_system_reports_integrity(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 75.0;
        $model->hullMax = 100.0;
        $ship = new Ship($model);

        $this->assertSame(75.0, $ship->hull()->getIntegrity());
        $this->assertSame(0.75, $ship->hull()->getIntegrityPercent());
    }

    public function test_navigation_reports_position(): void
    {
        $model = $this->createModel();
        $model->nodeId = 42;
        $ship = new Ship($model);

        $this->assertSame(42, $ship->navigation()->getCurrentPosition());
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
        $model->sensorType = SensorType::SRS;
        $model->shieldType = ShieldType::Standard;
        $model->navTier = NavTier::Tier1;
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
