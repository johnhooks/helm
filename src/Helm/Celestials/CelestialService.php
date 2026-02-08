<?php

declare(strict_types=1);

namespace Helm\Celestials;

use Helm\Stars\StarPost;

/**
 * Service for querying and serializing celestial contents at nodes.
 */
final class CelestialService
{
    public function __construct(
        private readonly CelestialRepository $repository,
    ) {
    }

    /**
     * Get the primary star at a node, if any.
     *
     * For binary/multi-star systems, returns the primary star
     * (the one with is_primary=true). Falls back to the first star found.
     */
    public function getStarAtNode(int $nodeId): ?StarPost
    {
        $celestials = $this->repository->findByNodeIdAndType($nodeId, CelestialType::Star);
        if ($celestials === []) {
            return null;
        }

        // Single star — fast path
        if (count($celestials) === 1) {
            return StarPost::fromId($celestials[0]->contentId);
        }

        // Multiple stars — find the primary
        $fallback = null;
        foreach ($celestials as $celestial) {
            $starPost = StarPost::fromId($celestial->contentId);
            if ($starPost === null) {
                continue;
            }

            if ($starPost->toStar()->isPrimary()) {
                return $starPost;
            }

            $fallback ??= $starPost;
        }

        return $fallback;
    }

    /**
     * Serialize only stars at a single node (star summaries).
     *
     * @return list<array<string, mixed>>
     */
    public function serializeStarsForNode(int $nodeId): array
    {
        $celestials = $this->repository->findByNodeIdAndType($nodeId, CelestialType::Star);
        if ($celestials === []) {
            return [];
        }

        $this->primeCaches($celestials);

        $stars = [];
        foreach ($celestials as $celestial) {
            $star = $this->serializeStar($celestial);
            if ($star !== null) {
                $stars[] = $star;
            }
        }

        return $stars;
    }

    /**
     * Batch-serialize stars for multiple nodes, grouped by node ID.
     *
     * @param int[] $nodeIds
     * @return array<int, list<array<string, mixed>>> Stars keyed by node ID.
     */
    public function serializeStarsForNodes(array $nodeIds): array
    {
        if ($nodeIds === []) {
            return [];
        }

        $celestials = $this->repository->findByNodeIds($nodeIds, CelestialType::Star);
        if ($celestials === []) {
            return [];
        }

        $this->primeCaches($celestials);

        $result = [];
        foreach ($celestials as $celestial) {
            $star = $this->serializeStar($celestial);
            if ($star !== null) {
                $result[$celestial->nodeId][] = $star;
            }
        }

        return $result;
    }

    /**
     * Serialize a star to its lightweight summary.
     *
     * @return array<string, mixed>|null
     */
    private function serializeStar(Celestial $celestial): ?array
    {
        $starPost = StarPost::fromId($celestial->contentId);
        if ($starPost === null) {
            return null;
        }

        $star = $starPost->toStar();
        [$x, $y, $z] = $star->cartesian3D();

        return [
            'id'             => $celestial->contentId,
            'post_type'      => CelestialType::Star->value,
            'title'          => $star->displayName(),
            'node_id'        => $celestial->nodeId,
            'catalog_id'     => $star->id,
            'spectral_class' => $star->spectralClass(),
            'x'              => $x,
            'y'              => $y,
            'z'              => $z,
            'mass'           => $star->mass(),
            'radius'         => $star->radius(),
            'is_primary'     => $star->isPrimary(),
        ];
    }

    /**
     * Prime WP post and meta caches for celestials in one query.
     *
     * @param Celestial[] $celestials
     */
    private function primeCaches(array $celestials): void
    {
        if ($celestials === []) {
            return;
        }

        $postIds = array_map(fn (Celestial $c) => $c->contentId, $celestials);
        _prime_post_caches($postIds, true, false);
    }
}
