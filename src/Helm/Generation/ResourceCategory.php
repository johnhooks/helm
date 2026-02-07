<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * Resource categories.
 */
enum ResourceCategory: string
{
    case Ore = 'ore';
    case Gas = 'gas';
    case Ice = 'ice';
    case Organic = 'organic';
    case Special = 'special';

    public function label(): string
    {
        return match ($this) {
            self::Ore => __('Ore', 'helm'),
            self::Gas => __('Gas', 'helm'),
            self::Ice => __('Ice', 'helm'),
            self::Organic => __('Organic', 'helm'),
            self::Special => __('Special', 'helm'),
        };
    }

    /**
     * Get the volume per unit for this category.
     */
    public function volume(): float
    {
        return match ($this) {
            self::Ore => 0.1,
            self::Gas => 0.05,
            self::Ice => 0.15,
            self::Organic => 0.2,
            self::Special => 0.1,
        };
    }

    /**
     * Get extraction method description.
     */
    public function extractionMethod(): string
    {
        return match ($this) {
            self::Ore => __('Mining', 'helm'),
            self::Gas => __('Collection', 'helm'),
            self::Ice => __('Harvesting', 'helm'),
            self::Organic => __('Gathering', 'helm'),
            self::Special => __('Extraction', 'helm'),
        };
    }
}
