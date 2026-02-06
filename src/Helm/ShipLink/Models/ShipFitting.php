<?php

declare(strict_types=1);

namespace Helm\ShipLink\Models;

use DateTimeImmutable;
use Helm\ShipLink\ShipFittingSlot;
use Helm\StellarWP\Models\Model;
use Helm\StellarWP\Models\ModelPropertyDefinition;

/**
 * Ship fitting pivot row from the helm_ship_fittings table.
 *
 * Maps a component instance (ShipComponent) to a slot on a ship.
 * Each ship slot can hold one component, each component can be in one slot.
 *
 * @property int $ship_post_id
 * @property int $component_id
 * @property ShipFittingSlot $slot
 * @property DateTimeImmutable $installed_at
 */
final class ShipFitting extends Model
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

            'component_id' => (new ModelPropertyDefinition())
                ->type('int')
                ->required(),

            'slot' => (new ModelPropertyDefinition())
                ->type(ShipFittingSlot::class)
                ->required()
                ->readonly()
                ->castWith(static fn ($v) => $v instanceof ShipFittingSlot ? $v : ShipFittingSlot::from($v)),

            'installed_at' => (new ModelPropertyDefinition())
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
