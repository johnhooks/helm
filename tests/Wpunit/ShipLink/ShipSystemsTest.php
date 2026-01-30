<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\ShipLink\ShipSystems;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\ShipLink\ShipSystems
 */
class ShipSystemsTest extends WPTestCase
{
    public function test_from_row_creates_instance(): void
    {
        $row = [
            'ship_post_id' => 123,
            'core_type' => 2,
            'drive_type' => 1,
            'sensor_type' => 3,
            'shield_type' => 2,
            'nav_tier' => 3,
            'power_full_at' => '2025-01-15 10:00:00',
            'power_max' => 100.0,
            'shields_full_at' => '2025-01-15 11:00:00',
            'shields_max' => 100.0,
            'core_life' => 500.0,
            'hull_integrity' => 85.0,
            'hull_max' => 100.0,
            'node_id' => 42,
            'cargo' => '{"ore":50,"fuel":25}',
            'current_action_id' => 99,
            'created_at' => '2025-01-01 00:00:00',
            'updated_at' => '2025-01-15 12:00:00',
        ];

        $systems = ShipSystems::fromRow($row);

        $this->assertSame(123, $systems->shipPostId);
        $this->assertSame(CoreType::EpochS, $systems->coreType);
        $this->assertSame(DriveType::DR3, $systems->driveType);
        $this->assertSame(SensorType::SRH, $systems->sensorType);
        $this->assertSame(ShieldType::Standard, $systems->shieldType);
        $this->assertSame(NavTier::Tier3, $systems->navTier);
        $this->assertSame(100.0, $systems->powerMax);
        $this->assertSame(500.0, $systems->coreLife);
        $this->assertSame(85.0, $systems->hullIntegrity);
        $this->assertSame(42, $systems->nodeId);
        $this->assertSame(['ore' => 50, 'fuel' => 25], $systems->cargo);
        $this->assertSame(99, $systems->currentActionId);
    }

    public function test_from_row_handles_null_values(): void
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

        $systems = ShipSystems::fromRow($row);

        $this->assertNull($systems->powerFullAt);
        $this->assertNull($systems->shieldsFullAt);
        $this->assertNull($systems->nodeId);
        $this->assertSame([], $systems->cargo);
        $this->assertNull($systems->currentActionId);
    }

    public function test_to_row_produces_correct_format(): void
    {
        $now = new DateTimeImmutable('2025-01-15 10:00:00');

        $systems = new ShipSystems(
            shipPostId: 123,
            coreType: CoreType::EpochR,
            driveType: DriveType::DR7,
            sensorType: SensorType::SRL,
            shieldType: ShieldType::Heavy,
            navTier: NavTier::Tier5,
            powerFullAt: $now,
            powerMax: 100.0,
            shieldsFullAt: $now,
            shieldsMax: 200.0,
            coreLife: 500.0,
            hullIntegrity: 75.0,
            hullMax: 100.0,
            nodeId: 42,
            cargo: ['ore' => 100],
            currentActionId: 5,
            createdAt: $now,
            updatedAt: $now,
        );

        $row = $systems->toRow();

        $this->assertSame(123, $row['ship_post_id']);
        $this->assertSame(3, $row['core_type']); // EpochR = 3
        $this->assertSame(3, $row['drive_type']); // DR7 = 3
        $this->assertSame(1, $row['sensor_type']); // SRL = 1
        $this->assertSame(3, $row['shield_type']); // Heavy = 3
        $this->assertSame(5, $row['nav_tier']);
        $this->assertSame('2025-01-15 10:00:00', $row['power_full_at']);
        $this->assertSame('{"ore":100}', $row['cargo']);
    }

    public function test_defaults_creates_standard_ship(): void
    {
        $systems = ShipSystems::defaults(456);

        $this->assertSame(456, $systems->shipPostId);
        $this->assertSame(CoreType::EpochS, $systems->coreType);
        $this->assertSame(DriveType::DR5, $systems->driveType);
        $this->assertSame(SensorType::SRS, $systems->sensorType);
        $this->assertSame(ShieldType::Standard, $systems->shieldType);
        $this->assertSame(NavTier::Tier1, $systems->navTier);
        $this->assertSame(100.0, $systems->powerMax);
        $this->assertSame(100.0, $systems->shieldsMax); // Standard shield capacity
        $this->assertSame(750.0, $systems->coreLife); // EpochS core life
        $this->assertSame(100.0, $systems->hullIntegrity);
        $this->assertSame([], $systems->cargo);
        $this->assertNull($systems->currentActionId);
    }

    public function test_defaults_starts_with_full_power_and_shields(): void
    {
        $before = new DateTimeImmutable();
        $systems = ShipSystems::defaults(789);
        $after = new DateTimeImmutable();

        // Power and shields should be full (fullAt <= now)
        $this->assertNotNull($systems->powerFullAt);
        $this->assertNotNull($systems->shieldsFullAt);
        $this->assertGreaterThanOrEqual($before, $systems->powerFullAt);
        $this->assertLessThanOrEqual($after, $systems->powerFullAt);
    }

    public function test_roundtrip_preserves_data(): void
    {
        $original = ShipSystems::defaults(100);
        $row = $original->toRow();
        $row['created_at'] = $original->createdAt->format('Y-m-d H:i:s');
        $row['updated_at'] = $original->updatedAt->format('Y-m-d H:i:s');

        $restored = ShipSystems::fromRow($row);

        $this->assertSame($original->shipPostId, $restored->shipPostId);
        $this->assertSame($original->coreType, $restored->coreType);
        $this->assertSame($original->driveType, $restored->driveType);
        $this->assertSame($original->powerMax, $restored->powerMax);
        $this->assertSame($original->coreLife, $restored->coreLife);
    }
}
