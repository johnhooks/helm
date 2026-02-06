<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\Products\Models\Product;
use Helm\ShipLink\FittedComponent;
use Helm\ShipLink\ShipFittingSlot;
use Helm\ShipLink\Loadout;
use Helm\ShipLink\LoadoutFactory;
use Helm\ShipLink\Models\ShipFitting;
use Helm\ShipLink\Models\ShipComponent;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Loadout
 * @covers \Helm\ShipLink\FittedComponent
 * @covers \Helm\ShipLink\LoadoutFactory
 *
 * @property WpunitTester $tester
 */
class LoadoutTest extends WPTestCase
{
    private LoadoutFactory $loadoutFactory;

    public function _before(): void
    {
        parent::_before();
        $this->tester->haveOrigin();

        $this->loadoutFactory = helm(LoadoutFactory::class);
    }

    public function test_required_slots_accessible(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $this->assertInstanceOf(FittedComponent::class, $loadout->core());
        $this->assertInstanceOf(FittedComponent::class, $loadout->drive());
        $this->assertInstanceOf(FittedComponent::class, $loadout->sensor());
        $this->assertInstanceOf(FittedComponent::class, $loadout->shield());
        $this->assertInstanceOf(FittedComponent::class, $loadout->nav());
    }

    public function test_required_slot_throws_when_missing(): void
    {
        $loadout = new Loadout([]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage("Required slot 'core' is not fitted");
        $loadout->core();
    }

    public function test_slot_returns_null_for_empty(): void
    {
        $loadout = new Loadout([]);

        $this->assertNull($loadout->slot('equip_1'));
    }

    public function test_equipment_returns_empty_when_none(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        // Default loadout has no equipment
        $this->assertEmpty($loadout->equipment());
    }

    public function test_default_loadout_core_stats(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $core = $loadout->core();

        $this->assertSame('epoch_s', $core->slug());
        $this->assertSame('Epoch-S Standard', $core->label());
        $this->assertSame(750, $core->hp());
        $this->assertSame(750, $core->life());
        $this->assertSame(1.0, $core->product()->mult_b); // jump_cost_multiplier
        $this->assertSame(10.0, $core->product()->rate);  // regen_rate
    }

    public function test_default_loadout_drive_stats(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $drive = $loadout->drive();

        $this->assertSame('dr_505', $drive->slug());
        $this->assertNull($drive->hp());
        $this->assertNull($drive->life());
        $this->assertSame(1.0, $drive->product()->mult_b); // consumption
    }

    public function test_default_loadout_sensor_stats(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $sensor = $loadout->sensor();

        $this->assertSame('vrs_mk1', $sensor->slug());
        $this->assertSame(5.0, $sensor->product()->range);
    }

    public function test_default_loadout_shield_stats(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $shield = $loadout->shield();

        $this->assertSame('aegis_beta', $shield->slug());
        $this->assertSame(100.0, $shield->product()->capacity); // max_capacity
    }

    public function test_default_loadout_nav_stats(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $nav = $loadout->nav();

        $this->assertSame('nav_tier_1', $nav->slug());
        $this->assertSame(0.3, $nav->product()->mult_a); // skill
    }

    public function test_total_footprint(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        // epoch_s=25 + dr_505=30 + vrs_mk1=25 + aegis_beta=20 + nav_tier_1=0
        $this->assertSame(100, $loadout->totalFootprint());
    }

    public function test_cargo_capacity(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        // 300 - 100 (default footprint) = 200
        $this->assertSame(200, $loadout->cargoCapacity());
    }

    public function test_dirty_components_empty_when_clean(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $this->assertEmpty($loadout->dirtyComponents());
    }

    public function test_dirty_components_after_mutation(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        // Mutate core life
        $loadout->core()->component()->life = 700;

        $dirty = $loadout->dirtyComponents();
        $this->assertCount(1, $dirty);
        $this->assertSame(700, $dirty[0]->life);
    }

    public function test_fitted_component_accessors(): void
    {
        $shipPost = $this->tester->haveShip();
        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $core = $loadout->core();

        $this->assertGreaterThan(0, $core->id());
        $this->assertSame(ShipFittingSlot::Core, $core->slot());
        $this->assertSame('epoch_s', $core->slug());
        $this->assertSame('Epoch-S Standard', $core->label());
        $this->assertInstanceOf(Product::class, $core->product());
        $this->assertSame(750, $core->life());
        $this->assertSame(750, $core->hp());
        $this->assertSame(0, $core->usageCount());
        $this->assertSame(1.0, $core->condition());
        $this->assertInstanceOf(ShipComponent::class, $core->component());
        $this->assertInstanceOf(ShipFitting::class, $core->fitting());
    }

    public function test_buildDefaults_creates_all_slots(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $loadout = $this->loadoutFactory->buildDefaults($shipPost->postId(), 1);

        $this->assertNotNull($loadout->slot(ShipFittingSlot::Core));
        $this->assertNotNull($loadout->slot(ShipFittingSlot::Drive));
        $this->assertNotNull($loadout->slot(ShipFittingSlot::Sensor));
        $this->assertNotNull($loadout->slot(ShipFittingSlot::Shield));
        $this->assertNotNull($loadout->slot(ShipFittingSlot::Nav));
    }

    public function test_buildDefaults_sets_starter_origin(): void
    {
        $shipPost = $this->tester->haveShipPost();
        $loadout = $this->loadoutFactory->buildDefaults($shipPost->postId(), 1);

        $this->assertSame('starter', $loadout->core()->component()->origin);
        $this->assertSame('starter', $loadout->drive()->component()->origin);
    }

    public function test_build_roundtrip(): void
    {
        // buildDefaults then build should give same data
        $shipPost = $this->tester->haveShipPost();
        $this->loadoutFactory->buildDefaults($shipPost->postId(), 1);

        $loadout = $this->loadoutFactory->build($shipPost->postId());

        $this->assertSame('epoch_s', $loadout->core()->slug());
        $this->assertSame(750, $loadout->core()->life());
        $this->assertSame('dr_505', $loadout->drive()->slug());
        $this->assertSame('vrs_mk1', $loadout->sensor()->slug());
        $this->assertSame('aegis_beta', $loadout->shield()->slug());
        $this->assertSame('nav_tier_1', $loadout->nav()->slug());
    }
}
