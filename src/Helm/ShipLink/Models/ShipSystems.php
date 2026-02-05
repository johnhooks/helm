<?php

declare(strict_types=1);

namespace Helm\ShipLink\Models;

use DateTimeImmutable;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;
use Helm\StellarWP\Models\Model;
use Helm\StellarWP\Models\ModelPropertyDefinition;

/**
 * Ship component configuration from the helm_ship_systems table.
 *
 * This is a pure data model - it holds what's installed on the ship.
 * Core life is a property of the physical warp core (comes with the component).
 *
 * @property int $ship_post_id
 * @property CoreType $core_type
 * @property float $core_life
 * @property DriveType $drive_type
 * @property SensorType $sensor_type
 * @property ShieldType $shield_type
 * @property NavTier $nav_tier
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
            'ship_post_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->required()
                ->readonly(),

            // Component types
            'core_type' => (new ModelPropertyDefinition())
                ->type(CoreType::class)
                ->castWith(static fn ($v) => CoreType::from((int) $v))
                ->default(CoreType::EpochS),
            'core_life' => (new ModelPropertyDefinition())
                ->type('float')
                ->default(750.0),
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

            'created_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->castWith(static fn ($v) => self::castDateTime($v)),
            'updated_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->castWith(static fn ($v) => self::castDateTime($v)),
        ];
    }

    /**
     * Create default systems for a new ship.
     */
    public static function defaults(int $shipPostId): self
    {
        return new self([
            'ship_post_id' => $shipPostId,
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
}
