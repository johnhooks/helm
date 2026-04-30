<?php

declare(strict_types=1);

namespace Helm\Navigation\Contracts;

use Helm\Navigation\UserEdge;

/**
 * Repository contract for per-player edge discoveries.
 */
interface UserEdgeRepository
{
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
     * Total number of edges the user has discovered.
     */
    public function count(int $userId): int;

    /**
     * Timestamp of the user's most recent discovery, or null if they have
     * none. Formatted as an ISO 8601 string in UTC.
     */
    public function lastDiscovered(int $userId): ?string;
}
