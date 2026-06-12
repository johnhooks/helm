<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * Result of resolving one route scan checkpoint.
 */
final class ScanPhaseResult
{
    public function __construct(
        public readonly bool $failed,
        public readonly bool $complete,
        public readonly ?Node $node = null,
        public readonly ?Edge $edge = null,
    ) {
    }

    public static function failure(): self
    {
        return new self(failed: true, complete: false);
    }

    public static function waypoint(Node $node, Edge $edge): self
    {
        return new self(failed: false, complete: false, node: $node, edge: $edge);
    }

    public static function direct(Node $node, Edge $edge): self
    {
        return new self(failed: false, complete: true, node: $node, edge: $edge);
    }
}
