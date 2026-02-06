<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\FittingSlot;
use Helm\ShipLink\Models\Fitting;
use Helm\StellarWP\Models\Model;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Models\Fitting
 * @covers \Helm\ShipLink\FittingSlot
 */
class FittingTest extends WPTestCase
{
    public function test_can_construct_with_attributes(): void
    {
        $fitting = new Fitting([
            'ship_post_id' => 100,
            'system_id' => 42,
            'slot' => FittingSlot::Core,
        ]);

        $this->assertSame(100, $fitting->ship_post_id);
        $this->assertSame(42, $fitting->system_id);
        $this->assertSame(FittingSlot::Core, $fitting->slot);
    }

    public function test_fromData_casts_database_values(): void
    {
        $row = [
            'ship_post_id' => '100',
            'system_id' => '42',
            'slot' => 'drive',
            'installed_at' => '2025-06-15 10:00:00',
        ];

        $fitting = Fitting::fromData($row, Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);

        $this->assertSame(100, $fitting->ship_post_id);
        $this->assertSame(42, $fitting->system_id);
        $this->assertSame(FittingSlot::Drive, $fitting->slot);
        $this->assertInstanceOf(\DateTimeImmutable::class, $fitting->installed_at);
    }

    public function test_fitting_slot_enum_values(): void
    {
        $this->assertSame('core', FittingSlot::Core->value);
        $this->assertSame('drive', FittingSlot::Drive->value);
        $this->assertSame('sensor', FittingSlot::Sensor->value);
        $this->assertSame('shield', FittingSlot::Shield->value);
        $this->assertSame('nav', FittingSlot::Nav->value);
        $this->assertSame('equip_1', FittingSlot::Equip1->value);
        $this->assertSame('equip_2', FittingSlot::Equip2->value);
        $this->assertSame('equip_3', FittingSlot::Equip3->value);
    }

    public function test_fitting_slot_required_slots(): void
    {
        $required = FittingSlot::required();

        $this->assertCount(5, $required);
        $this->assertContains(FittingSlot::Core, $required);
        $this->assertContains(FittingSlot::Drive, $required);
        $this->assertContains(FittingSlot::Sensor, $required);
        $this->assertContains(FittingSlot::Shield, $required);
        $this->assertContains(FittingSlot::Nav, $required);
    }

    public function test_fitting_slot_equipment_slots(): void
    {
        $equipment = FittingSlot::equipment();

        $this->assertCount(3, $equipment);
        $this->assertContains(FittingSlot::Equip1, $equipment);
        $this->assertContains(FittingSlot::Equip2, $equipment);
        $this->assertContains(FittingSlot::Equip3, $equipment);
    }

    public function test_fitting_slot_is_required(): void
    {
        $this->assertTrue(FittingSlot::Core->isRequired());
        $this->assertTrue(FittingSlot::Drive->isRequired());
        $this->assertFalse(FittingSlot::Equip1->isRequired());
        $this->assertFalse(FittingSlot::Equip2->isRequired());
    }

    public function test_ship_post_id_is_readonly(): void
    {
        $fitting = new Fitting([
            'ship_post_id' => 100,
            'system_id' => 42,
            'slot' => FittingSlot::Core,
        ]);

        $this->expectException(\Helm\StellarWP\Models\Exceptions\ReadOnlyPropertyException::class);
        $fitting->ship_post_id = 200;
    }

    public function test_slot_is_readonly(): void
    {
        $fitting = new Fitting([
            'ship_post_id' => 100,
            'system_id' => 42,
            'slot' => FittingSlot::Core,
        ]);

        $this->expectException(\Helm\StellarWP\Models\Exceptions\ReadOnlyPropertyException::class);
        $fitting->slot = FittingSlot::Drive;
    }

    public function test_system_id_is_mutable(): void
    {
        $fitting = new Fitting([
            'ship_post_id' => 100,
            'system_id' => 42,
            'slot' => FittingSlot::Core,
        ]);

        $fitting->system_id = 99;
        $this->assertSame(99, $fitting->system_id);
    }
}
