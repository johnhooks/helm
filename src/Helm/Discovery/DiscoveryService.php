<?php

declare(strict_types=1);

namespace Helm\Discovery;

use Helm\Generation\Generated\SystemContents;
use Helm\Origin\Origin;

/**
 * Service for recording and querying discoveries.
 */
final class DiscoveryService
{
    public function __construct(
        private readonly DiscoveryRepository $repository,
        private readonly Origin $origin,
    ) {
    }

    /**
     * Record a discovery.
     */
    public function record(string $starId, string $shipId, SystemContents $contents): Discovery
    {
        $isFirst = ! $this->isDiscovered($starId);

        $discovery = new Discovery(
            id: 0, // Will be set by database
            starId: $starId,
            shipId: $shipId,
            contentsHash: $contents->hash(),
            isFirst: $isFirst,
            discoveredAt: time(),
        );

        return $this->repository->save($discovery);
    }

    /**
     * Check if a star has been discovered by anyone.
     */
    public function isDiscovered(string $starId): bool
    {
        return $this->repository->countByStarId($starId) > 0;
    }

    /**
     * Get the number of times a star has been discovered.
     */
    public function getDiscoveryCount(string $starId): int
    {
        return $this->repository->countByStarId($starId);
    }

    /**
     * Check if a star is considered "known space".
     *
     * Known space is when a star has been discovered by enough ships
     * that it's considered common knowledge.
     */
    public function isKnownSpace(string $starId): bool
    {
        $threshold = $this->origin->config()->knownSpaceThreshold;
        return $this->getDiscoveryCount($starId) >= $threshold;
    }

    /**
     * Get the first discoverer of a star.
     */
    public function getFirstDiscoverer(string $starId): ?string
    {
        $discovery = $this->repository->getFirstByStarId($starId);
        return $discovery?->shipId;
    }

    /**
     * Get all discoveries by a ship.
     *
     * @return array<Discovery>
     */
    public function getByShip(string $shipId): array
    {
        return $this->repository->findByShipId($shipId);
    }

    /**
     * Get all discoveries for a star.
     *
     * @return array<Discovery>
     */
    public function getByStar(string $starId): array
    {
        return $this->repository->findByStarId($starId);
    }

    /**
     * Get all first discoveries (across all stars).
     *
     * @return array<Discovery>
     */
    public function getFirstDiscoveries(int $limit = 100): array
    {
        return $this->repository->findFirstDiscoveries($limit);
    }

    /**
     * Check if a ship has discovered a star.
     */
    public function hasShipDiscovered(string $shipId, string $starId): bool
    {
        return $this->repository->existsByShipAndStar($shipId, $starId);
    }
}
