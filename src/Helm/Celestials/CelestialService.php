<?php

declare(strict_types=1);

namespace Helm\Celestials;

use Helm\Stars\StarPost;
use WP_REST_Request;

/**
 * Service for querying celestial contents at nodes.
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
     * Get all content at a node as full WP REST representations.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getNodeContents(int $nodeId): array
    {
        $celestials = $this->repository->findByNodeId($nodeId);

        $result = [];
        foreach ($celestials as $celestial) {
            $data = $this->restRepresentation($celestial);

            if ($data !== null) {
                $result[] = $data;
            }
        }

        return $result;
    }

    /**
     * Get stars at a node as full WP REST representations.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getNodeStars(int $nodeId): array
    {
        $celestials = $this->repository->findByNodeIdAndType($nodeId, CelestialType::Star);

        $stars = [];
        foreach ($celestials as $celestial) {
            $data = $this->restRepresentation($celestial);

            if ($data !== null) {
                $stars[] = $data;
            }
        }

        return $stars;
    }

    /**
     * Get the full WP REST representation for a celestial's content post.
     *
     * Dispatches an internal REST request to the post type's endpoint,
     * returning the same data as /wp/v2/{rest_base}/{id}.
     *
     * @return array<string, mixed>|null
     */
    private function restRepresentation(Celestial $celestial): ?array
    {
        $postType = get_post_type_object($celestial->type->value);
        if ($postType === null || ! $postType->show_in_rest) {
            return null;
        }

        $restBase = $postType->rest_base !== false ? $postType->rest_base : $postType->name;
        $request = new WP_REST_Request('GET', "/wp/v2/{$restBase}/{$celestial->contentId}");
        $request->set_param('context', 'view');
        $response = rest_do_request($request);

        if ($response->is_error()) {
            return null;
        }

        return $response->get_data();
    }
}
