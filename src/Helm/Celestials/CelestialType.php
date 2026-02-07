<?php

declare(strict_types=1);

namespace Helm\Celestials;

use Helm\PostTypes\PostTypeRegistry;

/**
 * Type of celestial content linked to a navigation node.
 */
enum CelestialType: string
{
    case Star = 'helm_star';
    case Station = 'helm_station';
    case Anomaly = 'helm_anomaly';

    /**
     * Get the post type slug for this celestial type.
     */
    public function postType(): string
    {
        return $this->value;
    }

    /**
     * Create from a post type slug.
     */
    public static function fromPostType(string $postType): ?self
    {
        return match ($postType) {
            PostTypeRegistry::POST_TYPE_STAR => self::Star,
            PostTypeRegistry::POST_TYPE_STATION => self::Station,
            PostTypeRegistry::POST_TYPE_ANOMALY => self::Anomaly,
            default => null,
        };
    }
}
