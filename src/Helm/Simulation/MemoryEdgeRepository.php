<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Edge;

/**
 * In-memory edge repository for simulation.
 */
final class MemoryEdgeRepository implements EdgeRepository
{
    /** @var array<int, Edge> Indexed by edge ID */
    private array $edges = [];

    private int $nextId = 1;

    public function get(int $id): ?Edge
    {
        return $this->edges[$id] ?? null;
    }

    public function getBetween(int $nodeA, int $nodeB): ?Edge
    {
        $a = min($nodeA, $nodeB);
        $b = max($nodeA, $nodeB);

        foreach ($this->edges as $edge) {
            if ($edge->nodeAId === $a && $edge->nodeBId === $b) {
                return $edge;
            }
        }

        return null;
    }

    public function fromNode(int $nodeId): array
    {
        return array_values(array_filter(
            $this->edges,
            static fn (Edge $e) => $e->connectsNode($nodeId),
        ));
    }

    public function publicEdges(): array
    {
        throw new \BadMethodCallException('MemoryEdgeRepository::publicEdges() is not implemented.');
    }

    public function discoveredBy(string $shipId): array
    {
        throw new \BadMethodCallException('MemoryEdgeRepository::discoveredBy() is not implemented.');
    }

    public function save(Edge $edge): Edge
    {
        if ($edge->id === 0) {
            return $this->create(
                $edge->nodeAId,
                $edge->nodeBId,
                $edge->distance,
                $edge->discoveredByShipId,
                $edge->algorithmVersion,
            );
        }

        $this->edges[$edge->id] = $edge;

        return $edge;
    }

    public function create(
        int $nodeA,
        int $nodeB,
        float $distance,
        ?string $discoveredByShipId = null,
        int $algorithmVersion = 1,
    ): Edge {
        $id = $this->nextId++;

        $edge = new Edge(
            id: $id,
            nodeAId: min($nodeA, $nodeB),
            nodeBId: max($nodeA, $nodeB),
            distance: $distance,
            discoveredByShipId: $discoveredByShipId,
            traversalCount: 0,
            algorithmVersion: $algorithmVersion,
            createdAt: Date::nowString(),
        );

        $this->edges[$id] = $edge;

        return $edge;
    }

    /**
     * Increment traversal count — requires rebuilding the readonly Edge.
     */
    public function incrementTraversal(int $edgeId): void
    {
        $edge = $this->edges[$edgeId] ?? null;
        if ($edge === null) {
            return;
        }

        $this->edges[$edgeId] = new Edge(
            id: $edge->id,
            nodeAId: $edge->nodeAId,
            nodeBId: $edge->nodeBId,
            distance: $edge->distance,
            discoveredByShipId: $edge->discoveredByShipId,
            traversalCount: $edge->traversalCount + 1,
            algorithmVersion: $edge->algorithmVersion,
            createdAt: $edge->createdAt,
        );
    }

    public function incrementTraversalBetween(int $nodeA, int $nodeB): void
    {
        $edge = $this->getBetween($nodeA, $nodeB);
        if ($edge === null) {
            return;
        }

        $this->incrementTraversal($edge->id);
    }

    public function delete(int $id): bool
    {
        if (!isset($this->edges[$id])) {
            return false;
        }

        unset($this->edges[$id]);

        return true;
    }

    public function deleteForNode(int $nodeId): int
    {
        $count = 0;

        foreach ($this->edges as $id => $edge) {
            if ($edge->connectsNode($nodeId)) {
                unset($this->edges[$id]);
                $count++;
            }
        }

        return $count;
    }

    public function count(): int
    {
        return count($this->edges);
    }

    public function exists(int $nodeA, int $nodeB): bool
    {
        return $this->getBetween($nodeA, $nodeB) !== null;
    }
}
