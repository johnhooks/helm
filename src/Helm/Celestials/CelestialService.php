<?php

declare(strict_types=1);

namespace Helm\Celestials;

use Helm\Anomalies\AnomalyPost;
use Helm\Stars\StarPost;
use Helm\Stations\StationPost;

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
     * Get all content at a node.
     *
     * @param bool $embed Whether to include full post data
     * @return array{stars: array<int, array<string, mixed>>, stations: array<int, array<string, mixed>>, anomalies: array<int, array<string, mixed>>}
     */
    public function getNodeContents(int $nodeId, bool $embed = false): array
    {
        $celestials = $this->repository->findByNodeId($nodeId);

        $result = [
            'stars' => [],
            'stations' => [],
            'anomalies' => [],
        ];

        foreach ($celestials as $celestial) {
            $data = $embed
                ? $this->embedContent($celestial)
                : $this->basicContent($celestial);

            if ($data === null) {
                continue;
            }

            match ($celestial->type) {
                CelestialType::Star => $result['stars'][] = $data,
                CelestialType::Station => $result['stations'][] = $data,
                CelestialType::Anomaly => $result['anomalies'][] = $data,
            };
        }

        return $result;
    }

    /**
     * Get basic content reference.
     *
     * @return array{id: int, name: string}|null
     */
    private function basicContent(Celestial $celestial): ?array
    {
        $post = get_post($celestial->contentId);
        if ($post === null) {
            return null;
        }

        return [
            'id' => $celestial->contentId,
            'name' => $post->post_title,
        ];
    }

    /**
     * Get embedded content with full data.
     *
     * @return array<string, mixed>|null
     */
    private function embedContent(Celestial $celestial): ?array
    {
        return match ($celestial->type) {
            CelestialType::Star => $this->embedStar($celestial->contentId),
            CelestialType::Station => $this->embedStation($celestial->contentId),
            CelestialType::Anomaly => $this->embedAnomaly($celestial->contentId),
        };
    }

    /**
     * Embed star data.
     *
     * @return array<string, mixed>|null
     */
    private function embedStar(int $postId): ?array
    {
        $starPost = StarPost::fromId($postId);
        if ($starPost === null) {
            return null;
        }

        $star = $starPost->toStar();

        return [
            'id' => $postId,
            'catalog_id' => $star->id,
            'name' => $star->displayName(),
            'spectral_type' => $star->spectralType,
            'distance_ly' => $star->distanceLy,
        ];
    }

    /**
     * Embed station data.
     *
     * @return array<string, mixed>|null
     */
    private function embedStation(int $postId): ?array
    {
        $stationPost = StationPost::fromId($postId);
        if ($stationPost === null) {
            return null;
        }

        $station = $stationPost->toStation();

        return [
            'id' => $postId,
            'name' => $station->name,
            'type' => $station->type,
            'owner_id' => $station->ownerId,
        ];
    }

    /**
     * Embed anomaly data.
     *
     * @return array<string, mixed>|null
     */
    private function embedAnomaly(int $postId): ?array
    {
        $anomalyPost = AnomalyPost::fromId($postId);
        if ($anomalyPost === null) {
            return null;
        }

        $anomaly = $anomalyPost->toAnomaly();

        return [
            'id' => $postId,
            'name' => $anomaly->name,
            'type' => $anomaly->type,
        ];
    }
}
