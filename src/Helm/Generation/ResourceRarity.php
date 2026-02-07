<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Resource rarity levels.
 *
 * Affects yield rates, base values, and spawn frequency.
 */
enum ResourceRarity: string
{
    case Common = 'common';
    case Uncommon = 'uncommon';
    case Rare = 'rare';
    case VeryRare = 'very_rare';

    public function label(): string
    {
        return match ($this) {
            self::Common => __('Common', 'helm'),
            self::Uncommon => __('Uncommon', 'helm'),
            self::Rare => __('Rare', 'helm'),
            self::VeryRare => __('Very Rare', 'helm'),
        };
    }

    /**
     * Get base mining yield per hour.
     */
    public function yieldPerHour(): int
    {
        return match ($this) {
            self::Common => 10,
            self::Uncommon => 6,
            self::Rare => 3,
            self::VeryRare => 1,
        };
    }

    /**
     * Get base value in credits per unit.
     */
    public function baseValue(): int
    {
        return match ($this) {
            self::Common => 5,
            self::Uncommon => 15,
            self::Rare => 50,
            self::VeryRare => 200,
        };
    }

    /**
     * Get spawn weight (higher = more common in generation).
     */
    public function spawnWeight(): int
    {
        return match ($this) {
            self::Common => 100,
            self::Uncommon => 40,
            self::Rare => 10,
            self::VeryRare => 2,
        };
    }
}
