<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\ShipLink\Models\ShipSystems;
use Helm\ShipLink\ShipSystemsRepository;
use Helm\StellarWP\Models\Model;
use lucatume\WPBrowser\TestCase\WPTestCase;
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
            'core_type' => 2,
            'core_life' => 500.0,
            'drive_type' => 1,
            'sensor_type' => 3,
            'shield_type' => 2,
            'nav_tier' => 3,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-15 12:00:00',
        ];

        $systems = ShipSystems::fromData($row, Model::BUILD_MODE_IGNORE_MISSING);

        $this->assertSame(123, $systems->ship_post_id);
        $this->assertSame(CoreType::EpochS, $systems->core_type);
        $this->assertSame(DriveType::DR3, $systems->drive_type);
        $this->assertSame(SensorType::ACU, $systems->sensor_type);
        $this->assertSame(ShieldType::Beta, $systems->shield_type);
        $this->assertSame(NavTier::Tier3, $systems->nav_tier);
        $this->assertSame(500.0, $systems->core_life);
    }

    public function test_defaults_creates_standard_config(): void
    {
        $systems = ShipSystems::defaults(456);

        $this->assertSame(456, $systems->ship_post_id);
        $this->assertSame(CoreType::EpochS, $systems->core_type);
        $this->assertSame(DriveType::DR5, $systems->drive_type);
        $this->assertSame(SensorType::VRS, $systems->sensor_type);
        $this->assertSame(ShieldType::Beta, $systems->shield_type);
        $this->assertSame(NavTier::Tier1, $systems->nav_tier);
        $this->assertSame(750.0, $systems->core_life);
    }

    public function test_dirty_tracking_works(): void
    {
        $systems = ShipSystems::defaults(100);
        $systems->syncOriginal();

        $this->assertFalse($systems->isDirty());

        $systems->core_life = 500.0;

        $this->assertTrue($systems->isDirty());
        $this->assertTrue($systems->isDirty('core_life'));
        $this->assertFalse($systems->isDirty('core_type'));

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
        $this->assertSame($original->core_life, $restored->core_life);
    }
}
