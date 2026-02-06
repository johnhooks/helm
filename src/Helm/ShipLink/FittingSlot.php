<?php

declare(strict_types=1);

namespace Helm\ShipLink;

/**
 * Ship fitting slot identifiers.
 *
 * Each slot can hold one component. Required slots (core, drive, sensor,
 * shield, nav) must always be filled. Equipment slots are optional.
 */
enum FittingSlot: string
{
    case Core = 'core';
    case Drive = 'drive';
    case Sensor = 'sensor';
    case Shield = 'shield';
    case Nav = 'nav';
    case Equip1 = 'equip_1';
    case Equip2 = 'equip_2';
    case Equip3 = 'equip_3';

    /**
     * Check if this is a required slot.
     */
    public function isRequired(): bool
    {
        return match ($this) {
            self::Core,
            self::Drive,
            self::Sensor,
            self::Shield,
            self::Nav => true,
            self::Equip1,
            self::Equip2,
            self::Equip3 => false,
        };
    }

    /**
     * Get all required slots.
     *
     * @return array<FittingSlot>
     */
    public static function required(): array
    {
        return [
            self::Core,
            self::Drive,
            self::Sensor,
            self::Shield,
            self::Nav,
        ];
    }

    /**
     * Get all equipment slots.
     *
     * @return array<FittingSlot>
     */
    public static function equipment(): array
    {
        return [
            self::Equip1,
            self::Equip2,
            self::Equip3,
        ];
    }
}
