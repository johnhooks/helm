<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * Input parameters for a navigation scan.
 *
 * The scan attempts to compute a path from one node to another.
 * Gameplay variables affect success probability and discovery depth.
 */
final class ScanInput
{
    /**
     * @param Node  $from       Starting node
     * @param Node  $to         Target node
     * @param float $chance     Base success rate (0.0-1.0). 1.0 = guaranteed first hop.
     * @param float $skill      Bonus hop discovery (0.0-1.0). Higher = reveal more hops.
     * @param float $efficiency Bonus hop discovery (0.0-1.0). Higher = reveal more hops.
     */
    public function __construct(
        public readonly Node $from,
        public readonly Node $to,
        public readonly float $chance = 1.0,
        public readonly float $skill = 0.5,
        public readonly float $efficiency = 0.5,
    ) {}

    /**
     * Get the distance between from and to nodes.
     */
    public function distance(): float
    {
        return $this->from->distanceTo($this->to);
    }

    /**
     * Create with default values (guaranteed success, medium skill).
     */
    public static function create(Node $from, Node $to): self
    {
        return new self($from, $to);
    }

    /**
     * Create with specific gameplay values.
     */
    public static function withStats(
        Node $from,
        Node $to,
        float $chance,
        float $skill,
        float $efficiency,
    ): self {
        return new self(
            from: $from,
            to: $to,
            chance: max(0.0, min(1.0, $chance)),
            skill: max(0.0, min(1.0, $skill)),
            efficiency: max(0.0, min(1.0, $efficiency)),
        );
    }
}
