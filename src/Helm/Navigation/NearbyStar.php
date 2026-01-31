<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Stars\StarPost;

/**
 * A nearby star with full info for display.
 *
 * Returned by NavigationService::getNearbyStars() with all
 * relations batch-loaded to avoid N+1 queries.
 */
final class NearbyStar
{
    public function __construct(
        public readonly Node $node,
        public readonly StarPost $star,
        public readonly float $distance,
        public readonly bool $hasRoute,
    ) {
    }
}
