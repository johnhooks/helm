<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Lib\Date;
use Helm\Navigation\Contracts\EdgeRepository;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\UserEdge;

/**
 * In-memory per-player edge discovery repository for simulation.
 */
final class MemoryUserEdgeRepository implements UserEdgeRepository
{
    /** @var array<int, array<int, string>> Indexed by user ID, then edge ID. */
    private array $discoveries = [];

    public function __construct(
        private readonly EdgeRepository $edgeRepository,
    ) {
    }

    public function upsert(int $userId, int $edgeId): void
    {
        $this->discoveries[$userId] ??= [];
        $this->discoveries[$userId][$edgeId] ??= Date::nowString();
    }

    public function paginate(int $userId, int $page, int $perPage): array
    {
        $edges = $this->edgesFor($userId, array_keys($this->discoveries[$userId] ?? []));
        usort($edges, static fn (UserEdge $a, UserEdge $b): int => $a->discoveredAt <=> $b->discoveredAt);

        return [
            'edges' => array_slice($edges, max(0, $page - 1) * $perPage, $perPage),
            'total' => count($edges),
        ];
    }

    public function getMany(int $userId, array $edgeIds): array
    {
        return $this->edgesFor($userId, $edgeIds);
    }

    public function count(int $userId): int
    {
        return count($this->discoveries[$userId] ?? []);
    }

    public function lastDiscovered(int $userId): ?string
    {
        $discoveries = $this->discoveries[$userId] ?? [];
        if ($discoveries === []) {
            return null;
        }

        rsort($discoveries);
        return $discoveries[0];
    }

    /**
     * @param int[] $edgeIds
     * @return UserEdge[]
     */
    private function edgesFor(int $userId, array $edgeIds): array
    {
        $edges = [];

        foreach ($edgeIds as $edgeId) {
            $edgeId = (int) $edgeId;
            $discoveredAt = $this->discoveries[$userId][$edgeId] ?? null;
            $edge = $this->edgeRepository->get($edgeId);

            if ($discoveredAt === null || $edge === null) {
                continue;
            }

            $edges[] = new UserEdge(
                userId: $userId,
                edgeId: $edge->id,
                nodeAId: $edge->nodeAId,
                nodeBId: $edge->nodeBId,
                distance: $edge->distance,
                discoveredAt: $discoveredAt,
            );
        }

        return $edges;
    }
}
