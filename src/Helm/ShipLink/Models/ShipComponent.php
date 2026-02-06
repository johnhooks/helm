<?php

declare(strict_types=1);

namespace Helm\ShipLink\Models;

use DateTimeImmutable;
use Helm\StellarWP\Models\Model;
use Helm\StellarWP\Models\ModelPropertyDefinition;

/**
 * Ship component instance from the helm_ship_components table.
 *
 * Represents a specific physical component that exists in the game world.
 * References a Product for its blueprint stats.
 *
 * @property int $id
 * @property int $product_id
 * @property ?int $life
 * @property int $usage_count
 * @property float $condition
 * @property ?int $created_by
 * @property ?array $owner_history
 * @property ?string $origin
 * @property ?int $origin_ref
 * @property DateTimeImmutable $created_at
 * @property DateTimeImmutable $updated_at
 */
final class ShipComponent extends Model
{
    /**
     * @inheritDoc
     */
    protected static function properties(): array
    {
        return [
            'id' => (new ModelPropertyDefinition())
                ->type('int')
                ->readonly(),

            'product_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->required(),

            'life' => (new ModelPropertyDefinition())
                ->type('int')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (int) $v),

            'usage_count' => (new ModelPropertyDefinition())
                ->type('int')
                ->default(0),

            'condition' => (new ModelPropertyDefinition())
                ->type('float')
                ->default(1.0),

            'created_by' => (new ModelPropertyDefinition())
                ->type('int')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (int) $v),

            'owner_history' => (new ModelPropertyDefinition())
                ->type('array')
                ->castWith(static function ($v) {
                    if (is_array($v)) {
                        return $v;
                    }
                    if (is_string($v)) {
                        $decoded = json_decode($v, true);
                        return is_array($decoded) ? $decoded : null;
                    }
                    return null;
                }),

            'origin' => (new ModelPropertyDefinition())
                ->type('string')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (string) $v),

            'origin_ref' => (new ModelPropertyDefinition())
                ->type('int')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (int) $v),

            'created_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->castWith(static fn ($v) => self::castDateTime($v)),

            'updated_at' => (new ModelPropertyDefinition())
                ->type(DateTimeImmutable::class)
                ->castWith(static fn ($v) => self::castDateTime($v)),
        ];
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
