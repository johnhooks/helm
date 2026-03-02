<?php

declare(strict_types=1);

namespace Helm\Navigation\Contracts;

use Helm\Navigation\Node;
use Helm\Navigation\NodeType;

/**
 * Repository contract for navigation node operations.
 */
interface NodeRepository
{
    /**
     * Find a node by ID.
     *
     * @param int $id
     * @return Node|null
     */
    public function get(int $id): ?Node;

    /**
     * Find multiple nodes by ID.
     *
     * @param int[] $ids
     * @return Node[] Indexed by node ID
     */
    public function getMany(array $ids): array;

    /**
     * Paginate nodes with optional type filter.
     *
     * @param NodeType|null $type
     * @param int $page
     * @param int $perPage
     * @return array{nodes: Node[], total: int}
     */
    public function paginate(?NodeType $type = null, int $page = 1, int $perPage = 100): array;

    /**
     * Find a waypoint by hash.
     *
     * @param string $hash
     * @return Node|null
     */
    public function getByHash(string $hash): ?Node;

    /**
     * Find all system nodes.
     *
     * @return Node[]
     */
    public function allSystems(): array;

    /**
     * Find nodes within a distance from a point.
     *
     * @param float $x
     * @param float $y
     * @param float $z
     * @param float $maxDistance
     * @return Node[]
     */
    public function withinDistance(float $x, float $y, float $z, float $maxDistance): array;

    /**
     * Find nodes within distance from another node.
     *
     * @param Node $node
     * @param float $maxDistance
     * @return Node[]
     */
    public function neighborsOf(Node $node, float $maxDistance): array;

    /**
     * Save a node (insert or update).
     *
     * @param Node $node
     * @return Node
     */
    public function save(Node $node): Node;

    /**
     * Create a node.
     *
     * @param float $x
     * @param float $y
     * @param float $z
     * @param NodeType $type
     * @param string|null $hash
     * @param int $algorithmVersion
     * @return Node
     */
    public function create(
        float $x,
        float $y,
        float $z,
        NodeType $type = NodeType::Waypoint,
        ?string $hash = null,
        int $algorithmVersion = 1,
    ): Node;

    /**
     * Delete a node by ID.
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool;

    /**
     * Count all nodes.
     *
     * @return int
     */
    public function count(): int;

    /**
     * Count system nodes.
     *
     * @return int
     */
    public function countSystems(): int;

    /**
     * Count waypoint nodes.
     *
     * @return int
     */
    public function countWaypoints(): int;
}
