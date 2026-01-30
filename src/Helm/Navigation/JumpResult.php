<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Ships\Ship;

/**
 * Result of a successful jump.
 */
final class JumpResult
{
    public function __construct(
        public readonly Ship $ship,
        public readonly float $fuelUsed,
        public readonly float $distance,
    ) {
    }
}
