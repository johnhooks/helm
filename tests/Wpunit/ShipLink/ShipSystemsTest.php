<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\ShipLink\Models\ShipSystems;
use Helm\ShipLink\ShipSystemsRepository;
use lucatume\WPBrowser\TestCase\WPTestCase;
use Helm\StellarWP\Models\Model;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\ShipLink\Models\ShipSystems
 *
 * @property WpunitTester $tester
 */
class ShipSystemsTest extends WPTestCase
{
    private ShipSystemsRepository $repository;

    public function _before(): void
    {
        parent::_before();
        $this->repository = helm(ShipSystemsRepository::class);
    }

    public function test_can_construct_with_attributes(): void
    {
        $systems = new ShipSystems([
            'ship_post_id' => 123,
            'core_type' => CoreType::EpochR,
            'drive_type' => DriveType::DR7,
            'core_life' => 500.0,
        ]);

        $this->assertSame(123, $systems->ship_post_id);
        $this->assertSame(CoreType::EpochR, $systems->core_type);
        $this->assertSame(DriveType::DR7, $systems->drive_type);
        $this->assertSame(500.0, $systems->core_life);
    }

    public function test_fromData_casts_database_values(): void
    {
        $row = [
            'ship_post_id' => 123,
            'core_type' => 2, // int -> CoreType
            'drive_type' => 1,
            'sensor_type' => 3,
            'shield_type' => 2,
            'nav_tier' => 3,
            'power_full_at' => '2025-01-15 10:00:00', // string -> DateTimeImmutable
            'power_max' => 100.0,
            'shields_full_at' => '2025-01-15 11:00:00',
            'shields_max' => 100.0,
            'core_life' => 500.0,
            'hull_integrity' => 85.0,
            'hull_max' => 100.0,
            'node_id' => 42,
            'cargo' => '{"ore":50,"fuel":25}', // JSON string -> array
            'current_action_id' => 99,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-15 12:00:00',
        ];

        $systems = ShipSystems::fromData($row, Model::BUILD_MODE_IGNORE_MISSING);

        $this->assertSame(123, $systems->ship_post_id);
        $this->assertSame(CoreType::EpochS, $systems->core_type); // 2 = EpochS
        $this->assertSame(DriveType::DR3, $systems->drive_type);
        $this->assertSame(SensorType::ACU, $systems->sensor_type);
        $this->assertSame(ShieldType::Beta, $systems->shield_type);
        $this->assertSame(NavTier::Tier3, $systems->nav_tier);
        $this->assertInstanceOf(DateTimeImmutable::class, $systems->power_full_at);
        $this->assertSame(500.0, $systems->core_life);
        $this->assertSame(85.0, $systems->hull_integrity);
        $this->assertSame(42, $systems->node_id);
        $this->assertSame(['ore' => 50, 'fuel' => 25], $systems->cargo);
        $this->assertSame(99, $systems->current_action_id);
    }

    public function test_fromData_handles_null_values(): void
    {
        $row = [
            'ship_post_id' => 123,
            'core_type' => 1,
            'drive_type' => 2,
            'sensor_type' => 2,
            'shield_type' => 1,
            'nav_tier' => 1,
            'power_full_at' => null,
            'power_max' => 100.0,
            'shields_full_at' => null,
            'shields_max' => 50.0,
            'core_life' => 1000.0,
            'hull_integrity' => 100.0,
            'hull_max' => 100.0,
            'node_id' => null,
            'cargo' => null,
            'current_action_id' => null,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-01 00:00:00',
        ];

        $systems = ShipSystems::fromData($row, Model::BUILD_MODE_IGNORE_MISSING);

        $this->assertNull($systems->power_full_at);
        $this->assertNull($systems->shields_full_at);
        $this->assertNull($systems->node_id);
        $this->assertSame([], $systems->cargo);
        $this->assertNull($systems->current_action_id);
    }

    public function test_defaults_creates_standard_ship(): void
    {
        $systems = ShipSystems::defaults(456);

        $this->assertSame(456, $systems->ship_post_id);
        $this->assertSame(CoreType::EpochS, $systems->core_type);
        $this->assertSame(DriveType::DR5, $systems->drive_type);
        $this->assertSame(SensorType::VRS, $systems->sensor_type);
        $this->assertSame(ShieldType::Beta, $systems->shield_type);
        $this->assertSame(NavTier::Tier1, $systems->nav_tier);
        $this->assertSame(100.0, $systems->power_max);
        $this->assertSame(100.0, $systems->shields_max); // Standard shield capacity
        $this->assertSame(750.0, $systems->core_life); // EpochS core life
        $this->assertSame(100.0, $systems->hull_integrity);
        $this->assertSame([], $systems->cargo);
        $this->assertNull($systems->current_action_id);
    }

    public function test_new_ship_starts_with_full_power_and_shields(): void
    {
        $this->tester->haveOrigin();
        $shipPost = $this->tester->haveShipPost();

        $systems = ShipSystems::defaults($shipPost->postId());
        $this->repository->insert($systems);

        // Reload from database to get database-set timestamps
        $restored = $this->repository->find($shipPost->postId());

        // Power and shields should be full (fullAt set by database DEFAULT CURRENT_TIMESTAMP)
        $this->assertNotNull($restored->power_full_at);
        $this->assertNotNull($restored->shields_full_at);
        $this->assertInstanceOf(DateTimeImmutable::class, $restored->power_full_at);
        $this->assertInstanceOf(DateTimeImmutable::class, $restored->shields_full_at);
    }

    public function test_dirty_tracking_works(): void
    {
        $systems = ShipSystems::defaults(100);
        $systems->syncOriginal(); // Mark as saved

        $this->assertFalse($systems->isDirty());

        $systems->core_life = 500.0;

        $this->assertTrue($systems->isDirty());
        $this->assertTrue($systems->isDirty('core_life'));
        $this->assertFalse($systems->isDirty('hull_integrity'));

        $dirty = $systems->getDirty();
        $this->assertArrayHasKey('core_life', $dirty);
        $this->assertSame(500.0, $dirty['core_life']);
    }

    public function test_repository_roundtrip_preserves_data(): void
    {
        $this->tester->haveOrigin();
        $shipPost = $this->tester->haveShipPost();

        $original = ShipSystems::defaults($shipPost->postId());
        $this->repository->insert($original);

        $restored = $this->repository->find($shipPost->postId());

        $this->assertNotNull($restored);
        $this->assertSame($original->ship_post_id, $restored->ship_post_id);
        $this->assertSame($original->core_type, $restored->core_type);
        $this->assertSame($original->drive_type, $restored->drive_type);
        $this->assertSame($original->power_max, $restored->power_max);
        $this->assertSame($original->core_life, $restored->core_life);
    }
}
