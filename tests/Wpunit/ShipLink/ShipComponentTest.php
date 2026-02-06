<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Models\ShipComponent;
use Helm\StellarWP\Models\Model;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\Models\ShipComponent
 */
class ShipComponentTest extends WPTestCase
{
    public function test_can_construct_with_attributes(): void
    {
        $component = new ShipComponent([
            'product_id' => 5,
            'life' => 750,
            'usage_count' => 10,
            'condition' => 0.95,
            'created_by' => 1,
            'origin' => 'starter',
        ]);

        $this->assertSame(5, $component->product_id);
        $this->assertSame(750, $component->life);
        $this->assertSame(10, $component->usage_count);
        $this->assertSame(0.95, $component->condition);
        $this->assertSame(1, $component->created_by);
        $this->assertSame('starter', $component->origin);
    }

    public function test_fromData_casts_database_values(): void
    {
        $row = [
            'id' => '42',
            'product_id' => '5',
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

        $component = ShipComponent::fromData($row, Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);

        $this->assertSame(42, $component->id);
        $this->assertSame(5, $component->product_id);
        $this->assertSame(750, $component->life);
        $this->assertSame(10, $component->usage_count);
        $this->assertSame(0.95, $component->condition);
        $this->assertSame(1, $component->created_by);
        $this->assertSame(['user_1', 'user_2'], $component->owner_history);
        $this->assertSame('manufactured', $component->origin);
        $this->assertSame(99, $component->origin_ref);
    }

    public function test_life_nullable(): void
    {
        $component = new ShipComponent([
            'product_id' => 1,
            'life' => null,
        ]);

        $this->assertNull($component->life);
    }

    public function test_defaults(): void
    {
        $component = new ShipComponent([
            'product_id' => 1,
        ]);

        $this->assertSame(0, $component->usage_count);
        $this->assertSame(1.0, $component->condition);
        $this->assertNull($component->life);
        $this->assertNull($component->created_by);
        $this->assertNull($component->owner_history);
        $this->assertNull($component->origin);
        $this->assertNull($component->origin_ref);
    }

    public function test_dirty_tracking(): void
    {
        $component = new ShipComponent([
            'product_id' => 1,
            'life' => 750,
        ]);
        $component->syncOriginal();

        $this->assertFalse($component->isDirty());

        $component->life = 700;

        $this->assertTrue($component->isDirty());
        $this->assertTrue($component->isDirty('life'));
        $this->assertFalse($component->isDirty('condition'));

        $dirty = $component->getDirty();
        $this->assertArrayHasKey('life', $dirty);
        $this->assertSame(700, $dirty['life']);
    }

    public function test_owner_history_cast_from_null(): void
    {
        $row = [
            'id' => '1',
            'product_id' => '1',
            'owner_history' => null,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-01 00:00:00',
        ];

        $component = ShipComponent::fromData($row, Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA);

        $this->assertNull($component->owner_history);
    }

    public function test_id_is_readonly(): void
    {
        $component = new ShipComponent(['product_id' => 1]);

        $this->expectException(\Helm\StellarWP\Models\Exceptions\ReadOnlyPropertyException::class);
        $component->id = 999;
    }
}
