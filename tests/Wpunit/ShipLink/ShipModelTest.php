<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\ShipLink\ShipModel;
use Helm\ShipLink\ShipSystems;
use Helm\Ships\ShipPost;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\ShipModel
 *
 * @property WpunitTester $tester
 */
class ShipModelTest extends WPTestCase
{
    public function test_from_parts_combines_data(): void
    {
        $shipPost = $this->tester->haveShip(['name' => 'USS Enterprise']);
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);

        $model = ShipModel::fromParts($shipPost, $systems);

        $this->assertSame($postId, $model->postId);
        $this->assertSame('USS Enterprise', $model->name);
        $this->assertSame(CoreType::EpochS, $model->coreType);
        $this->assertSame(750.0, $model->coreLife);
    }

    public function test_to_systems_converts_back(): void
    {
        $shipPost = $this->tester->haveShip();
        $postId = $shipPost->postId();

        $systems = ShipSystems::defaults($postId);
        $model = ShipModel::fromParts($shipPost, $systems);

        // Modify the model
        $model->coreLife = 500.0;
        $model->nodeId = 42;

        $newSystems = $model->toSystems();

        $this->assertSame($postId, $newSystems->shipPostId);
        $this->assertSame(500.0, $newSystems->coreLife);
        $this->assertSame(42, $newSystems->nodeId);
    }

    public function test_current_power_returns_max_when_full(): void
    {
        $model = $this->createModel();
        $now = new DateTimeImmutable();

        // Power is full when powerFullAt is in the past or now
        $model->powerFullAt = $now->modify('-1 hour');

        $this->assertSame($model->powerMax, $model->currentPower($now));
    }

    public function test_current_power_calculates_partial(): void
    {
        $model = $this->createModel();
        $model->coreType = CoreType::EpochS; // 10 power/hour regen
        $model->powerMax = 100.0;

        $now = new DateTimeImmutable();
        // Will be full in 5 hours = 50 power remaining
        $model->powerFullAt = $now->modify('+5 hours');

        $power = $model->currentPower($now);

        // 5 hours * 10/hour = 50 needed, so 100 - 50 = 50 current
        $this->assertEqualsWithDelta(50.0, $power, 0.1);
    }

    public function test_consume_power_adjusts_full_at(): void
    {
        $model = $this->createModel();
        $model->coreType = CoreType::EpochS; // 10 power/hour
        $model->powerMax = 100.0;

        $now = new DateTimeImmutable();
        $model->powerFullAt = $now; // Start full

        $model->consumePower(50.0, $now);

        // Should take 5 hours to regen 50 power at 10/hour
        $expectedFullAt = $now->modify('+5 hours');
        $this->assertEqualsWithDelta(
            $expectedFullAt->getTimestamp(),
            $model->powerFullAt->getTimestamp(),
            5 // Allow 5 seconds tolerance
        );
    }

    public function test_current_shields_returns_max_when_full(): void
    {
        $model = $this->createModel();
        $now = new DateTimeImmutable();

        $model->shieldsFullAt = $now->modify('-1 hour');

        $this->assertSame($model->shieldsMax, $model->currentShields($now));
    }

    public function test_damage_shields_adjusts_full_at(): void
    {
        $model = $this->createModel();
        $model->shieldType = ShieldType::Beta; // 10/hour regen
        $model->shieldsMax = 100.0;

        $now = new DateTimeImmutable();
        $model->shieldsFullAt = $now; // Start full

        $model->damageShields(30.0, $now);

        // Should take 3 hours to regen 30 shields at 10/hour
        $expectedFullAt = $now->modify('+3 hours');
        $this->assertEqualsWithDelta(
            $expectedFullAt->getTimestamp(),
            $model->shieldsFullAt->getTimestamp(),
            5
        );
    }

    public function test_damage_hull_reduces_integrity(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 100.0;

        $model->damageHull(25.0);

        $this->assertSame(75.0, $model->hullIntegrity);
    }

    public function test_damage_hull_does_not_go_negative(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 10.0;

        $model->damageHull(50.0);

        $this->assertSame(0.0, $model->hullIntegrity);
    }

    public function test_repair_hull_increases_integrity(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 50.0;
        $model->hullMax = 100.0;

        $model->repairHull(25.0);

        $this->assertSame(75.0, $model->hullIntegrity);
    }

    public function test_repair_hull_does_not_exceed_max(): void
    {
        $model = $this->createModel();
        $model->hullIntegrity = 90.0;
        $model->hullMax = 100.0;

        $model->repairHull(50.0);

        $this->assertSame(100.0, $model->hullIntegrity);
    }

    public function test_consume_core_life_applies_multiplier(): void
    {
        $model = $this->createModel();
        $model->coreType = CoreType::EpochR; // 1.5x jump cost
        $model->coreLife = 500.0;

        $model->consumeCoreLife(10.0); // 10 ly jump

        // 10 * 1.5 = 15 core life consumed
        $this->assertSame(485.0, $model->coreLife);
    }

    public function test_is_destroyed_when_hull_zero(): void
    {
        $model = $this->createModel();

        $model->hullIntegrity = 1.0;
        $this->assertFalse($model->isDestroyed());

        $model->hullIntegrity = 0.0;
        $this->assertTrue($model->isDestroyed());
    }

    public function test_is_core_depleted_when_zero(): void
    {
        $model = $this->createModel();

        $model->coreLife = 1.0;
        $this->assertFalse($model->isCoreDepeleted());

        $model->coreLife = 0.0;
        $this->assertTrue($model->isCoreDepeleted());
    }

    public function test_cargo_operations(): void
    {
        $model = $this->createModel();
        $model->cargo = [];

        $model->addCargo('ore', 50);
        $this->assertSame(50, $model->cargoQuantity('ore'));

        $model->addCargo('ore', 25);
        $this->assertSame(75, $model->cargoQuantity('ore'));

        $removed = $model->removeCargo('ore', 30);
        $this->assertSame(30, $removed);
        $this->assertSame(45, $model->cargoQuantity('ore'));
    }

    public function test_remove_cargo_returns_actual_removed(): void
    {
        $model = $this->createModel();
        $model->cargo = ['ore' => 10];

        $removed = $model->removeCargo('ore', 50);

        $this->assertSame(10, $removed);
        $this->assertSame(0, $model->cargoQuantity('ore'));
    }

    public function test_total_cargo(): void
    {
        $model = $this->createModel();
        $model->cargo = ['ore' => 50, 'fuel' => 25, 'gems' => 10];

        $this->assertSame(85, $model->totalCargo());
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
        $model->powerFullAt = null;
        $model->powerMax = 100.0;
        $model->shieldsFullAt = null;
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
