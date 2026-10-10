<?php

declare(strict_types=1);

namespace Helm\Navigation;

/** Shortest known path by distance, matching the frontend KnownPathResult. */
final class KnownPathResult
{
    /**
     * @param list<int> $nodeIds
     * @param list<int> $edgeIds
     */
    public function __construct(
        public readonly bool $reachable,
        public readonly bool $direct,
        public readonly array $nodeIds,
        public readonly array $edgeIds,
        public readonly float $totalDistance,
        public readonly ?int $nextNodeId,
    ) {
    }
}
