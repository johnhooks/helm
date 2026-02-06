<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\ShipFittingSlot;
use Helm\ShipLink\Models\ShipFitting;
use Helm\StellarWP\Models\Model;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Models\ShipFitting
 * @covers \Helm\ShipLink\ShipFittingSlot
 */
class ShipFittingTest extends WPTestCase
{
    public function test_can_construct_with_attributes(): void
    {
        $fitting = new ShipFitting([
            'ship_post_id' => 100,
            'component_id' => 42,
            'slot' => ShipFittingSlot::Core,
        ]);

        $this->assertSame(100, $fitting->ship_post_id);
        $this->assertSame(42, $fitting->component_id);
        $this->assertSame(ShipFittingSlot::Core, $fitting->slot);
    }

    public function test_fromData_casts_database_values(): void
    {
        $row = [
            'ship_post_id' => '100',
            'component_id' => '42',
            'slot' => 'drive',
            'installed_at' => '2025-06-15 10:00:00',
        ];

        $fitting = ShipFitting::fromData($row, Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);

        $this->assertSame(100, $fitting->ship_post_id);
        $this->assertSame(42, $fitting->component_id);
        $this->assertSame(ShipFittingSlot::Drive, $fitting->slot);
        $this->assertInstanceOf(\DateTimeImmutable::class, $fitting->installed_at);
    }

    public function test_fitting_slot_enum_values(): void
    {
        $this->assertSame('core', ShipFittingSlot::Core->value);
        $this->assertSame('drive', ShipFittingSlot::Drive->value);
        $this->assertSame('sensor', ShipFittingSlot::Sensor->value);
        $this->assertSame('shield', ShipFittingSlot::Shield->value);
        $this->assertSame('nav', ShipFittingSlot::Nav->value);
        $this->assertSame('equip_1', ShipFittingSlot::Equip1->value);
        $this->assertSame('equip_2', ShipFittingSlot::Equip2->value);
        $this->assertSame('equip_3', ShipFittingSlot::Equip3->value);
    }

    public function test_fitting_slot_required_slots(): void
    {
        $required = ShipFittingSlot::required();

        $this->assertCount(5, $required);
        $this->assertContains(ShipFittingSlot::Core, $required);
        $this->assertContains(ShipFittingSlot::Drive, $required);
        $this->assertContains(ShipFittingSlot::Sensor, $required);
        $this->assertContains(ShipFittingSlot::Shield, $required);
        $this->assertContains(ShipFittingSlot::Nav, $required);
    }

    public function test_fitting_slot_equipment_slots(): void
    {
        $equipment = ShipFittingSlot::equipment();

        $this->assertCount(3, $equipment);
        $this->assertContains(ShipFittingSlot::Equip1, $equipment);
        $this->assertContains(ShipFittingSlot::Equip2, $equipment);
        $this->assertContains(ShipFittingSlot::Equip3, $equipment);
    }

    public function test_fitting_slot_is_required(): void
    {
        $this->assertTrue(ShipFittingSlot::Core->isRequired());
        $this->assertTrue(ShipFittingSlot::Drive->isRequired());
        $this->assertFalse(ShipFittingSlot::Equip1->isRequired());
        $this->assertFalse(ShipFittingSlot::Equip2->isRequired());
    }

    public function test_ship_post_id_is_readonly(): void
    {
        $fitting = new ShipFitting([
            'ship_post_id' => 100,
            'component_id' => 42,
            'slot' => ShipFittingSlot::Core,
        ]);

        $this->expectException(\Helm\StellarWP\Models\Exceptions\ReadOnlyPropertyException::class);
        $fitting->ship_post_id = 200;
    }

    public function test_slot_is_readonly(): void
    {
        $fitting = new ShipFitting([
            'ship_post_id' => 100,
            'component_id' => 42,
            'slot' => ShipFittingSlot::Core,
        ]);

        $this->expectException(\Helm\StellarWP\Models\Exceptions\ReadOnlyPropertyException::class);
        $fitting->slot = ShipFittingSlot::Drive;
    }

    public function test_component_id_is_mutable(): void
    {
        $fitting = new ShipFitting([
            'ship_post_id' => 100,
            'component_id' => 42,
            'slot' => ShipFittingSlot::Core,
        ]);

        $fitting->component_id = 99;
        $this->assertSame(99, $fitting->component_id);
    }
}
