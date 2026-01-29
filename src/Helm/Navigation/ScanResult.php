<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * Result of a navigation scan.
 *
 * Contains the nodes and edges discovered during the scan,
 * and whether the complete path to the destination was found.
 */
final class ScanResult
{
    /**
     * @param Node[] $nodes    Nodes discovered (in order from start toward destination)
     * @param Edge[] $edges    Edges connecting the discovered nodes
     * @param bool   $complete True if the path reaches the destination
     * @param bool   $failed   True if the scan failed entirely (no path computed)
     */
    public function __construct(
        public readonly array $nodes,
        public readonly array $edges,
        public readonly bool $complete,
        public readonly bool $failed = false,
    ) {}

    /**
     * Create a successful scan result.
     *
     * @param Node[] $nodes
     * @param Edge[] $edges
     */
    public static function success(array $nodes, array $edges, bool $complete): self
    {
        return new self(
            nodes: $nodes,
            edges: $edges,
            complete: $complete,
            failed: false,
        );
    }

    /**
     * Create a failed scan result (no path computed).
     */
    public static function failure(): self
    {
        return new self(
            nodes: [],
            edges: [],
            complete: false,
            failed: true,
        );
    }

    /**
     * Get the number of hops discovered.
     */
    public function hopCount(): int
    {
        return count($this->nodes);
    }

    /**
     * Get the next node to jump to (first discovered node).
     */
    public function nextNode(): ?Node
    {
        return $this->nodes[0] ?? null;
    }

    /**
     * Get the total distance of discovered path.
     */
    public function totalDistance(): float
    {
        return array_sum(array_map(
            fn (Edge $edge) => $edge->distance,
            $this->edges
        ));
    }

    /**
     * Get the path as node IDs.
     *
     * @return int[]
     */
    public function pathIds(): array
    {
        return array_map(fn (Node $node) => $node->id, $this->nodes);
    }
}
