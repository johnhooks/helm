<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Models\ShipSystem;
use Helm\StellarWP\Models\Model;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Models\ShipSystem
 */
class ShipSystemTest extends WPTestCase
{
    public function test_can_construct_with_attributes(): void
    {
        $system = new ShipSystem([
            'type_id' => 5,
            'life' => 750,
            'usage_count' => 10,
            'condition' => 0.95,
            'created_by' => 1,
            'origin' => 'starter',
        ]);

        $this->assertSame(5, $system->type_id);
        $this->assertSame(750, $system->life);
        $this->assertSame(10, $system->usage_count);
        $this->assertSame(0.95, $system->condition);
        $this->assertSame(1, $system->created_by);
        $this->assertSame('starter', $system->origin);
    }

    public function test_fromData_casts_database_values(): void
    {
        $row = [
            'id' => '42',
            'type_id' => '5',
            'life' => '750',
            'usage_count' => '10',
            'condition' => '0.95',
            'created_by' => '1',
            'owner_history' => '["user_1","user_2"]',
            'origin' => 'manufactured',
            'origin_ref' => '99',
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-01 00:00:00',
        ];

        $system = ShipSystem::fromData($row, Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);

        $this->assertSame(42, $system->id);
        $this->assertSame(5, $system->type_id);
        $this->assertSame(750, $system->life);
        $this->assertSame(10, $system->usage_count);
        $this->assertSame(0.95, $system->condition);
        $this->assertSame(1, $system->created_by);
        $this->assertSame(['user_1', 'user_2'], $system->owner_history);
        $this->assertSame('manufactured', $system->origin);
        $this->assertSame(99, $system->origin_ref);
    }

    public function test_life_nullable(): void
    {
        $system = new ShipSystem([
            'type_id' => 1,
            'life' => null,
        ]);

        $this->assertNull($system->life);
    }

    public function test_defaults(): void
    {
        $system = new ShipSystem([
            'type_id' => 1,
        ]);

        $this->assertSame(0, $system->usage_count);
        $this->assertSame(1.0, $system->condition);
        $this->assertNull($system->life);
        $this->assertNull($system->created_by);
        $this->assertNull($system->owner_history);
        $this->assertNull($system->origin);
        $this->assertNull($system->origin_ref);
    }

    public function test_dirty_tracking(): void
    {
        $system = new ShipSystem([
            'type_id' => 1,
            'life' => 750,
        ]);
        $system->syncOriginal();

        $this->assertFalse($system->isDirty());

        $system->life = 700;

        $this->assertTrue($system->isDirty());
        $this->assertTrue($system->isDirty('life'));
        $this->assertFalse($system->isDirty('condition'));

        $dirty = $system->getDirty();
        $this->assertArrayHasKey('life', $dirty);
        $this->assertSame(700, $dirty['life']);
    }

    public function test_owner_history_cast_from_null(): void
    {
        $row = [
            'id' => '1',
            'type_id' => '1',
            'owner_history' => null,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-01 00:00:00',
        ];

        $system = ShipSystem::fromData($row, Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);

        $this->assertNull($system->owner_history);
    }

    public function test_id_is_readonly(): void
    {
        $system = new ShipSystem(['type_id' => 1]);

        $this->expectException(\Helm\StellarWP\Models\Exceptions\ReadOnlyPropertyException::class);
        $system->id = 999;
    }
}
