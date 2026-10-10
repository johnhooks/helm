<?php

declare(strict_types=1);

namespace Helm\Navigation\Contracts;

use Helm\Navigation\UserEdge;
use InvalidArgumentException;

/**
 * Repository contract for per-player edge discoveries.
 */
interface UserEdgeRepository
{
    public const MAX_NODE_IDS = 100;

    /**
     * Record that the user has discovered the given edge.
     *
     * Idempotent: repeated calls for the same (userId, edgeId) are no-ops
     * that preserve the original discovered_at timestamp.
     */
    public function upsert(int $userId, int $edgeId): void;

    /**
     * A page of edges the user has discovered, oldest first.
     *
     * @return array{edges: UserEdge[], total: int}
     */
    public function paginate(int $userId, int $page, int $perPage): array;

    /**
     * Specific edges the user has discovered, oldest first.
     *
     * @param int[] $edgeIds
     * @return UserEdge[]
     */
    public function getMany(int $userId, array $edgeIds): array;

    /**
     * Target nodes with a direct edge discovered by this user from the origin.
     * Only the supplied targets are considered; edge direction does not matter.
     *
     * @throws InvalidArgumentException When more than MAX_NODE_IDS entries are supplied, including duplicates.
     * @param int[] $targetNodeIds
     * @return int[]
     */
    public function discoveredTargets(int $userId, int $fromNodeId, array $targetNodeIds): array;

    /**
     * Supplied nodes touched by any edge discovered by the user, regardless of origin.
     * This does not establish reachability from a ship.
     *
     * @throws InvalidArgumentException When more than MAX_NODE_IDS entries are supplied, including duplicates.
     * @param int[] $nodeIds
     * @return int[]
     */
    public function nodesWithDiscoveredEdges(int $userId, array $nodeIds): array;

    /**
     * Discovered edges touching one node, ordered by discovery time then edge ID.
     *
     * @return list<UserEdge>
     */
    public function fromNode(int $userId, int $nodeId): array;

    /**
     * Total number of edges the user has discovered.
     */
    public function count(int $userId): int;

    /**
     * Timestamp of the user's most recent discovery, or null if they have
     * none. Formatted as an ISO 8601 string in UTC.
     */
    public function lastDiscovered(int $userId): ?string;
}
