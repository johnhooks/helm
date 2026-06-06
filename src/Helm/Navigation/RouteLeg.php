<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * A directional leg within a ship route plan.
 */
final class RouteLeg
{
    public function __construct(
        public readonly UserEdge $edge,
        public readonly int $fromNodeId,
        public readonly int $toNodeId,
        public readonly ?UserEdge $nextEdge = null,
    ) {
    }

    public function distance(): float
    {
        return $this->edge->distance;
    }
}
