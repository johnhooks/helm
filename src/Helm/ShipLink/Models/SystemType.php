<?php

declare(strict_types=1);

namespace Helm\ShipLink\Models;

use DateTimeImmutable;
use Helm\StellarWP\Models\Model;
use Helm\StellarWP\Models\ModelPropertyDefinition;

/**
 * System type catalog row from the helm_system_types table.
 *
 * Defines a component blueprint: what stats it has, how much space it takes,
 * and its maximum hit points. Individual instances reference a SystemType
 * via type_id.
 *
 * Generic stat columns - each component type uses a subset:
 * | Type   | rate  | range   | capacity | chance  | mult_a   | mult_b      | mult_c    |
 * |--------|-------|---------|----------|---------|----------|-------------|-----------|
 * | core   | regen | -       | (hp)     | -       | output   | cost        | -         |
 * | drive  | -     | sustain | -        | -       | speed    | consumption | amplitude |
 * | sensor | -     | range   | -        | success | duration | -           | -         |
 * | shield | regen | -       | capacity | -       | -        | -           | -         |
 * | nav    | -     | -       | -        | -       | skill    | efficiency  | -         |
 *
 * @property int $id
 * @property string $slug
 * @property string $type
 * @property string $label
 * @property int $version
 * @property ?int $hp
 * @property int $footprint
 * @property ?float $rate
 * @property ?float $range
 * @property ?float $capacity
 * @property ?float $chance
 * @property ?float $mult_a
 * @property ?float $mult_b
 * @property ?float $mult_c
 * @property DateTimeImmutable $created_at
 * @property DateTimeImmutable $updated_at
 */
final class SystemType extends Model
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

            'slug' => (new ModelPropertyDefinition())
                ->type('string')
                ->required(),

            'type' => (new ModelPropertyDefinition())
                ->type('string')
                ->required(),

            'label' => (new ModelPropertyDefinition())
                ->type('string')
                ->required(),

            'version' => (new ModelPropertyDefinition())
                ->type('int')
                ->default(1),

            'hp' => (new ModelPropertyDefinition())
                ->type('int')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (int) $v),

            'footprint' => (new ModelPropertyDefinition())
                ->type('int')
                ->default(0),

            'rate' => (new ModelPropertyDefinition())
                ->type('float')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (float) $v),

            'range' => (new ModelPropertyDefinition())
                ->type('float')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (float) $v),

            'capacity' => (new ModelPropertyDefinition())
                ->type('float')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (float) $v),

            'chance' => (new ModelPropertyDefinition())
                ->type('float')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (float) $v),

            'mult_a' => (new ModelPropertyDefinition())
                ->type('float')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (float) $v),

            'mult_b' => (new ModelPropertyDefinition())
                ->type('float')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (float) $v),

            'mult_c' => (new ModelPropertyDefinition())
                ->type('float')
                ->castWith(static fn ($v) => $v === null || $v === '' ? null : (float) $v),

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
