<?php

declare(strict_types=1);

namespace Helm\ShipLink\Models;

use DateTimeImmutable;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\PowerMode;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\StellarWP\Models\Model;
use Helm\StellarWP\Models\ModelPropertyDefinition;

/**
 * Ship systems state from the helm_ship_systems table.
 *
 * This is a pure data model - it holds state and maps to/from the database.
 * All domain logic (calculations, mutations, state checks) lives in the
 * System classes (Power, Shields, Hull, Cargo, etc.).
 *
 * @property int $ship_post_id
 * @property CoreType $core_type
 * @property DriveType $drive_type
 * @property SensorType $sensor_type
 * @property ShieldType $shield_type
 * @property NavTier $nav_tier
 * @property PowerMode $power_mode
 * @property DateTimeImmutable|null $power_full_at
 * @property float $power_max
 * @property DateTimeImmutable|null $shields_full_at
 * @property float $shields_max
 * @property float $core_life
 * @property float $hull_integrity
 * @property float $hull_max
 * @property int|null $node_id
 * @property array<string, int> $cargo
 * @property int|null $current_action_id
 * @property DateTimeImmutable $created_at
 * @property DateTimeImmutable $updated_at
 */
final class ShipSystems extends Model
{
    /**
     * @inheritDoc
     */
    protected static function properties(): array
    {
        return [
            // Identity (readonly after creation)
            'ship_post_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->required()
                ->readonly(),

            // Configuration (mutable - changes on upgrades)
            'core_type' => (new ModelPropertyDefinition())
                ->type(CoreType::class)
                ->castWith(static fn ($v) => CoreType::from((int) $v))
                ->default(CoreType::EpochS),
            'drive_type' => (new ModelPropertyDefinition())
                ->type(DriveType::class)
                ->castWith(static fn ($v) => DriveType::from((int) $v))
                ->default(DriveType::DR5),
            'sensor_type' => (new ModelPropertyDefinition())
                ->type(SensorType::class)
                ->castWith(static fn ($v) => SensorType::from((int) $v))
                ->default(SensorType::VRS),
            'shield_type' => (new ModelPropertyDefinition())
                ->type(ShieldType::class)
                ->castWith(static fn ($v) => ShieldType::from((int) $v))
                ->default(ShieldType::Beta),
            'nav_tier' => (new ModelPropertyDefinition())
                ->type(NavTier::class)
                ->castWith(static fn ($v) => NavTier::from((int) $v))
                ->default(NavTier::Tier1),

            // Power state
            'power_mode' => (new ModelPropertyDefinition())
                ->type(PowerMode::class)
                ->castWith(static fn ($v) => PowerMode::from((int) $v))
                ->default(PowerMode::Normal),
            'power_full_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->nullable()
                ->castWith(static fn ($v) => self::castDateTime($v)),
            'power_max' => (new ModelPropertyDefinition())
                ->type('float')
                ->default(100.0),

            // Shield state
            'shields_full_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->nullable()
                ->castWith(static fn ($v) => self::castDateTime($v)),
            'shields_max' => (new ModelPropertyDefinition())
                ->type('float')
                ->default(100.0),

            // Core and hull
            'core_life' => (new ModelPropertyDefinition())
                ->type('float')
                ->default(750.0),
            'hull_integrity' => (new ModelPropertyDefinition())
                ->type('float')
                ->default(100.0),
            'hull_max' => (new ModelPropertyDefinition())
                ->type('float')
                ->default(100.0),

            // Navigation (null = no position)
            'node_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->nullable(),

            // Cargo
            'cargo' => (new ModelPropertyDefinition())
                ->type('array')
                ->castWith(static fn ($v) => self::castJson($v))
                ->default([]),

            // Current action
            'current_action_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->nullable()
                ->default(null),

            // Timestamps (managed by database - DEFAULT CURRENT_TIMESTAMP)
            'created_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->readonly()
                ->castWith(static fn ($v) => self::castDateTime($v)),
            'updated_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->castWith(static fn ($v) => self::castDateTime($v)),
        ];
    }

    /**
     * Create default systems for a new ship.
     *
     * Most defaults come from property definitions or database defaults.
     * This just sets the required ship_post_id and starting position.
     */
    public static function defaults(int $shipPostId): self
    {
        return new self([
            'ship_post_id' => $shipPostId,
            'node_id' => 1, // Sol - all ships start at Origin
        ]);
    }

    /**
     * Cast a value to DateTimeImmutable.
     */
    private static function castDateTime(mixed $value): ?DateTimeImmutable
    {
        if ($value instanceof DateTimeImmutable) {
            return $value;
        }

        if ($value === null || $value === '' || $value === '0000-00-00 00:00:00') {
            return null;
        }

        if (!is_string($value)) {
            return null;
        }

        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value);
        return $dt !== false ? $dt : null;
    }

    /**
     * Cast a value to array (from JSON).
     *
     * @return array<string, int>
     */
    private static function castJson(mixed $json): array
    {
        if (is_array($json)) {
            /** @var array<string, int> */
            return $json;
        }

        if ($json === null || $json === '') {
            return [];
        }

        if (!is_string($json)) {
            return [];
        }

        /** @var array<string, int> */
        return json_decode($json, true, 512, JSON_THROW_ON_ERROR) ?? [];
    }
}
