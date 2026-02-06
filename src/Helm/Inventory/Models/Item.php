<?php

declare(strict_types=1);

namespace Helm\Inventory\Models;

use DateTimeImmutable;
use Helm\Inventory\LocationType;
use Helm\StellarWP\Models\Model;
use Helm\StellarWP\Models\ModelPropertyDefinition;

/**
 * Inventory item from the helm_inventory table.
 *
 * Tracks all items owned by users - both fitted and stored.
 * - slot IS NULL = loose item (cargo/storage)
 * - slot = 'core' etc = fitted in that slot
 *
 * Lifecycle data (life, usage_count) is stored inline for components.
 * Meta stores provenance (created_by, origin, origin_ref, owner_history).
 *
 * @property int $id
 * @property int $user_id
 * @property int $product_id
 * @property LocationType $location_type
 * @property int|null $location_id
 * @property string|null $slot
 * @property int $quantity
 * @property int|null $life
 * @property int $usage_count
 * @property array|null $meta
 * @property DateTimeImmutable $created_at
 * @property DateTimeImmutable $updated_at
 */
final class Item extends Model
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

            'user_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->required()
                ->readonly(),

            'product_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->required()
                ->readonly(),

            'location_type' => (new ModelPropertyDefinition())
                ->type(LocationType::class)
                ->required()
                ->castWith(static fn ($v) => $v instanceof LocationType ? $v : LocationType::from((int) $v)),

            'location_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->nullable(),

            'slot' => (new ModelPropertyDefinition())
                ->type('string')
                ->nullable(),

            'quantity' => (new ModelPropertyDefinition())
                ->type('int')
                ->default(1),

            'life' => (new ModelPropertyDefinition())
                ->type('int')
                ->nullable()
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (int) $v),

            'usage_count' => (new ModelPropertyDefinition())
                ->type('int')
                ->default(0),

            'meta' => (new ModelPropertyDefinition())
                ->type('array')
                ->nullable()
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
