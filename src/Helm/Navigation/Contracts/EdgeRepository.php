<?php

declare(strict_types=1);

namespace Helm\Navigation\Contracts;

use Helm\Navigation\Edge;

/**
 * Repository contract for navigation edge operations.
 */
interface EdgeRepository
{
    /**
     * Find an edge by ID.
     *
     * @param int $id
     * @return Edge|null
     */
    public function get(int $id): ?Edge;

    /**
     * Find an edge between two nodes.
     *
     * @param int $nodeA
     * @param int $nodeB
     * @return Edge|null
     */
    public function getBetween(int $nodeA, int $nodeB): ?Edge;

    /**
     * Find all edges from a node.
     *
     * @param int $nodeId
     * @return Edge[]
     */
    public function fromNode(int $nodeId): array;

    /**
     * Find all public edges (well-traveled).
     *
     * @return Edge[]
     */
    public function publicEdges(): array;

    /**
     * Find edges discovered by a specific ship.
     *
     * @param string $shipId
     * @return Edge[]
     */
    public function discoveredBy(string $shipId): array;

    /**
     * Save an edge (insert or update).
     *
     * @param Edge $edge
     * @return Edge
     */
    public function save(Edge $edge): Edge;

    /**
     * Create an edge between two nodes.
     *
     * @param int $nodeA
     * @param int $nodeB
     * @param float $distance
     * @param string|null $discoveredByShipId
     * @param int $algorithmVersion
     * @return Edge
     */
    public function create(
        int $nodeA,
        int $nodeB,
        float $distance,
        ?string $discoveredByShipId = null,
        int $algorithmVersion = 1,
    ): Edge;

    /**
     * Increment traversal count for an edge.
     *
     * @param int $edgeId
     */
    public function incrementTraversal(int $edgeId): void;

    /**
     * Increment traversal count for edge between two nodes.
     *
     * @param int $nodeA
     * @param int $nodeB
     */
    public function incrementTraversalBetween(int $nodeA, int $nodeB): void;

    /**
     * Delete an edge by ID.
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool;

    /**
     * Delete all edges connected to a node.
     *
     * @param int $nodeId
     * @return int Number of deleted edges
     */
    public function deleteForNode(int $nodeId): int;

    /**
     * Count all edges.
     *
     * @return int
     */
    public function count(): int;

    /**
     * Check if an edge exists between two nodes.
     *
     * @param int $nodeA
     * @param int $nodeB
     * @return bool
     */
    public function exists(int $nodeA, int $nodeB): bool;
}
