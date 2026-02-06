<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Models\SystemType;
use Helm\StellarWP\Models\Model;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Models\SystemType
 */
class SystemTypeTest extends WPTestCase
{
    public function test_can_construct_with_attributes(): void
    {
        $type = new SystemType([
            'slug' => 'epoch_s',
            'type' => 'core',
            'label' => 'Epoch-S Standard',
            'version' => 1,
            'hp' => 750,
            'footprint' => 25,
            'rate' => 10.0,
            'mult_a' => 1.0,
            'mult_b' => 1.0,
        ]);

        $this->assertSame('epoch_s', $type->slug);
        $this->assertSame('core', $type->type);
        $this->assertSame('Epoch-S Standard', $type->label);
        $this->assertSame(1, $type->version);
        $this->assertSame(750, $type->hp);
        $this->assertSame(25, $type->footprint);
        $this->assertSame(10.0, $type->rate);
        $this->assertSame(1.0, $type->mult_a);
        $this->assertSame(1.0, $type->mult_b);
    }

    public function test_fromData_casts_database_values(): void
    {
        $row = [
            'id' => '5',
            'slug' => 'dr_505',
            'type' => 'drive',
            'label' => 'DR-505 Standard',
            'version' => '1',
            'hp' => null,
            'footprint' => '30',
            'rate' => null,
            'range' => '7.0',
            'capacity' => null,
            'chance' => null,
            'mult_a' => '1.0',
            'mult_b' => '1.0',
            'mult_c' => '1.0',
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-01 00:00:00',
        ];

        $type = SystemType::fromData($row, Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);

        $this->assertSame(5, $type->id);
        $this->assertSame('dr_505', $type->slug);
        $this->assertSame('drive', $type->type);
        $this->assertSame(1, $type->version);
        $this->assertNull($type->hp);
        $this->assertSame(30, $type->footprint);
        $this->assertSame(7.0, $type->range);
        $this->assertSame(1.0, $type->mult_a);
        $this->assertSame(1.0, $type->mult_b);
        $this->assertSame(1.0, $type->mult_c);
    }

    public function test_nullable_floats_cast_correctly(): void
    {
        $type = SystemType::fromData([
            'slug' => 'test',
            'type' => 'core',
            'label' => 'Test',
            'rate' => '5.0',
            'range' => '',
            'capacity' => null,
        ], Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);

        $this->assertSame(5.0, $type->rate);
        $this->assertNull($type->range);
        $this->assertNull($type->capacity);
    }

    public function test_hp_null_for_non_core_types(): void
    {
        $type = new SystemType([
            'slug' => 'test_drive',
            'type' => 'drive',
            'label' => 'Test Drive',
            'hp' => null,
        ]);

        $this->assertNull($type->hp);
    }

    public function test_version_defaults_to_one(): void
    {
        $type = new SystemType([
            'slug' => 'test',
            'type' => 'core',
            'label' => 'Test',
        ]);

        $this->assertSame(1, $type->version);
    }

    public function test_footprint_defaults_to_zero(): void
    {
        $type = new SystemType([
            'slug' => 'test',
            'type' => 'core',
            'label' => 'Test',
        ]);

        $this->assertSame(0, $type->footprint);
    }

    public function test_all_stat_columns_nullable(): void
    {
        $type = new SystemType([
            'slug' => 'minimal',
            'type' => 'equipment',
            'label' => 'Minimal',
        ]);

        $this->assertNull($type->rate);
        $this->assertNull($type->range);
        $this->assertNull($type->capacity);
        $this->assertNull($type->chance);
        $this->assertNull($type->mult_a);
        $this->assertNull($type->mult_b);
        $this->assertNull($type->mult_c);
    }

    public function test_core_stat_columns(): void
    {
        $type = new SystemType([
            'slug' => 'test_core',
            'type' => 'core',
            'label' => 'Test Core',
            'hp' => 750,
            'rate' => 10.0,      // regen_rate
            'mult_a' => 1.0,     // base_output
            'mult_b' => 1.0,     // jump_cost_multiplier
        ]);

        $this->assertSame(10.0, $type->rate);
        $this->assertSame(1.0, $type->mult_a);
        $this->assertSame(1.0, $type->mult_b);
    }

    public function test_drive_stat_columns(): void
    {
        $type = new SystemType([
            'slug' => 'test_drive',
            'type' => 'drive',
            'label' => 'Test Drive',
            'range' => 7.0,      // sustain
            'mult_a' => 1.0,     // speed_multiplier
            'mult_b' => 1.0,     // consumption
            'mult_c' => 1.0,     // amplitude
        ]);

        $this->assertSame(7.0, $type->range);
        $this->assertSame(1.0, $type->mult_a);
        $this->assertSame(1.0, $type->mult_b);
        $this->assertSame(1.0, $type->mult_c);
    }

    public function test_sensor_stat_columns(): void
    {
        $type = new SystemType([
            'slug' => 'test_sensor',
            'type' => 'sensor',
            'label' => 'Test Sensor',
            'range' => 5.0,
            'chance' => 0.7,     // scan_success_chance
            'mult_a' => 1.0,     // survey_duration_multiplier
        ]);

        $this->assertSame(5.0, $type->range);
        $this->assertSame(0.7, $type->chance);
        $this->assertSame(1.0, $type->mult_a);
    }

    public function test_shield_stat_columns(): void
    {
        $type = new SystemType([
            'slug' => 'test_shield',
            'type' => 'shield',
            'label' => 'Test Shield',
            'rate' => 10.0,      // regen_rate
            'capacity' => 100.0, // max_capacity
        ]);

        $this->assertSame(10.0, $type->rate);
        $this->assertSame(100.0, $type->capacity);
    }

    public function test_nav_stat_columns(): void
    {
        $type = new SystemType([
            'slug' => 'test_nav',
            'type' => 'nav',
            'label' => 'Test Nav',
            'mult_a' => 0.3,     // skill
            'mult_b' => 0.5,     // efficiency
        ]);

        $this->assertSame(0.3, $type->mult_a);
        $this->assertSame(0.5, $type->mult_b);
    }
}
