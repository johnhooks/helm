<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use DateTimeImmutable;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;

/**
 * Ship systems state from the helm_ship_systems table.
 *
 * Represents the operational state of a ship's systems.
 */
final class ShipSystems
{
    /**
     * @param array<string, int> $cargo
     */
    public function __construct(
        public readonly int $shipPostId,
        public readonly CoreType $coreType,
        public readonly DriveType $driveType,
        public readonly SensorType $sensorType,
        public readonly ShieldType $shieldType,
        public readonly NavTier $navTier,
        public readonly PowerMode $powerMode,
        public readonly ?DateTimeImmutable $powerFullAt,
        public readonly float $powerMax,
        public readonly ?DateTimeImmutable $shieldsFullAt,
        public readonly float $shieldsMax,
        public readonly float $coreLife,
        public readonly float $hullIntegrity,
        public readonly float $hullMax,
        public readonly ?int $nodeId,
        public readonly array $cargo,
        public readonly ?int $currentActionId,
        public readonly DateTimeImmutable $createdAt,
        public readonly DateTimeImmutable $updatedAt,
    ) {
    }

    /**
     * Create from database row.
     *
     * @param array<string, mixed> $row
     */
    public static function fromRow(array $row): self
    {
        return new self(
            shipPostId: (int) $row['ship_post_id'],
            coreType: CoreType::from((int) $row['core_type']),
            driveType: DriveType::from((int) $row['drive_type']),
            sensorType: SensorType::from((int) $row['sensor_type']),
            shieldType: ShieldType::from((int) $row['shield_type']),
            navTier: NavTier::from((int) $row['nav_tier']),
            powerMode: PowerMode::from((int) ($row['power_mode'] ?? PowerMode::Normal->value)),
            powerFullAt: self::parseDateTime($row['power_full_at'] ?? null),
            powerMax: (float) $row['power_max'],
            shieldsFullAt: self::parseDateTime($row['shields_full_at'] ?? null),
            shieldsMax: (float) $row['shields_max'],
            coreLife: (float) $row['core_life'],
            hullIntegrity: (float) $row['hull_integrity'],
            hullMax: (float) $row['hull_max'],
            nodeId: $row['node_id'] !== null ? (int) $row['node_id'] : null,
            cargo: self::decodeJson($row['cargo'] ?? null),
            currentActionId: $row['current_action_id'] !== null ? (int) $row['current_action_id'] : null,
            createdAt: self::parseDateTime($row['created_at']) ?? new DateTimeImmutable(),
            updatedAt: self::parseDateTime($row['updated_at']) ?? new DateTimeImmutable(),
        );
    }

    /**
     * Convert to database row format.
     *
     * @return array<string, mixed>
     */
    public function toRow(): array
    {
        return [
            'ship_post_id' => $this->shipPostId,
            'core_type' => $this->coreType->value,
            'drive_type' => $this->driveType->value,
            'sensor_type' => $this->sensorType->value,
            'shield_type' => $this->shieldType->value,
            'nav_tier' => $this->navTier->value,
            'power_mode' => $this->powerMode->value,
            'power_full_at' => $this->powerFullAt?->format('Y-m-d H:i:s'),
            'power_max' => $this->powerMax,
            'shields_full_at' => $this->shieldsFullAt?->format('Y-m-d H:i:s'),
            'shields_max' => $this->shieldsMax,
            'core_life' => $this->coreLife,
            'hull_integrity' => $this->hullIntegrity,
            'hull_max' => $this->hullMax,
            'node_id' => $this->nodeId,
            'cargo' => json_encode($this->cargo, JSON_THROW_ON_ERROR),
            'current_action_id' => $this->currentActionId,
        ];
    }

    /**
     * Create default systems for a new ship.
     */
    public static function defaults(int $shipPostId): self
    {
        $now = new DateTimeImmutable();
        $coreType = CoreType::EpochS;
        $shieldType = ShieldType::Beta;

        return new self(
            shipPostId: $shipPostId,
            coreType: $coreType,
            driveType: DriveType::DR5,
            sensorType: SensorType::VRS,
            shieldType: $shieldType,
            navTier: NavTier::Tier1,
            powerMode: PowerMode::Normal,
            powerFullAt: $now, // Start with full power
            powerMax: 100.0,
            shieldsFullAt: $now, // Start with full shields
            shieldsMax: $shieldType->maxCapacity(),
            coreLife: $coreType->coreLife(),
            hullIntegrity: 100.0,
            hullMax: 100.0,
            nodeId: null,
            cargo: [],
            currentActionId: null,
            createdAt: $now,
            updatedAt: $now,
        );
    }

    /**
     * Parse a datetime string.
     */
    private static function parseDateTime(?string $value): ?DateTimeImmutable
    {
        if ($value === null || $value === '' || $value === '0000-00-00 00:00:00') {
            return null;
        }

        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value);
        return $dt !== false ? $dt : null;
    }

    /**
     * Decode JSON column.
     *
     * @return array<string, int>
     */
    private static function decodeJson(?string $json): array
    {
        if ($json === null || $json === '') {
            return [];
        }

        return json_decode($json, true, 512, JSON_THROW_ON_ERROR) ?? [];
    }
}
