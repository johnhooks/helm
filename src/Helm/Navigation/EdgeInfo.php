<?php

declare(strict_types=1);

namespace Helm\Navigation;

/**
 * Information about an edge between two nodes.
 *
 * Returned by NavigationService for route planning.
 */
final class EdgeInfo
{
    public function __construct(
        public readonly int $fromNodeId,
        public readonly int $toNodeId,
        public readonly float $distance,
        public readonly NodeType $targetNodeType,
    ) {
    }

    /**
     * Create from an Edge and target Node.
     */
    public static function fromEdge(Edge $edge, int $fromNodeId, Node $targetNode): self
    {
        $toNodeId = $edge->nodeAId === $fromNodeId
            ? $edge->nodeBId
            : $edge->nodeAId;

        return new self(
            fromNodeId: $fromNodeId,
            toNodeId: $toNodeId,
            distance: $edge->distance,
            targetNodeType: $targetNode->type,
        );
    }
}
