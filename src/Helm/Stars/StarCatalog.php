<?php

declare(strict_types=1);

namespace Helm\Stars;

/**
 * Star catalog service.
 *
 * Loads and queries real star data from HYG catalog with NASA exoplanet data.
 * Default catalog contains 4,060 stars within 100 light years of Sol.
 */
final class StarCatalog
{
    /** @var array<string, Star>|null */
    private ?array $stars = null;

    /** @var array<string, Star>|null Stars indexed by name */
    private ?array $starsByName = null;

    /** @var array<string, mixed>|null Catalog metadata */
    private ?array $meta = null;

    public function __construct(
        private readonly string $catalogPath,
    ) {
    }

    /**
     * Get a star by its catalog ID (e.g., 'HIP_70890', 'SOL').
     */
    public function get(string $id): ?Star
    {
        $this->ensureLoaded();
        return $this->stars[$id] ?? null;
    }

    /**
     * Get a star by its common name.
     */
    public function getByName(string $name): ?Star
    {
        $this->ensureLoaded();
        $normalized = strtolower($name);
        return $this->starsByName[$normalized] ?? null;
    }

    /**
     * Get Sol (our Sun).
     */
    public function sol(): Star
    {
        $sol = $this->get('SOL');

        if ($sol === null) {
            throw new \RuntimeException('Sol not found in star catalog');
        }

        return $sol;
    }

    /**
     * Get the nearest stars by distance.
     *
     * @return array<Star>
     */
    public function nearest(int $limit = 100): array
    {
        $this->ensureLoaded();

        /** @var array<string, Star> $sorted */
        $sorted = $this->stars;
        uasort($sorted, fn(Star $a, Star $b) => $a->distanceLy <=> $b->distanceLy);

        return array_slice(array_values($sorted), 0, $limit);
    }

    /**
     * Get all stars within a distance from Sol.
     *
     * @return array<Star>
     */
    public function inRange(float $maxDistanceLy): array
    {
        $this->ensureLoaded();

        return array_values(
            array_filter(
                $this->stars,
                fn(Star $star) => $star->distanceLy <= $maxDistanceLy
            )
        );
    }

    /**
     * Search stars by name or ID.
     *
     * @return array<Star>
     */
    public function search(string $query, int $limit = 20): array
    {
        $this->ensureLoaded();

        $query = strtolower($query);
        $results = [];

        foreach ($this->stars as $star) {
            if (str_contains(strtolower($star->id), $query)) {
                $results[] = $star;
                continue;
            }

            if ($star->name !== null && str_contains(strtolower($star->name), $query)) {
                $results[] = $star;
            }
        }

        // Sort by relevance (exact matches first, then by distance)
        usort($results, function (Star $a, Star $b) use ($query) {
            $aExact = strtolower($a->name ?? '') === $query || strtolower($a->id) === $query;
            $bExact = strtolower($b->name ?? '') === $query || strtolower($b->id) === $query;

            if ($aExact !== $bExact) {
                return $bExact <=> $aExact;
            }

            return $a->distanceLy <=> $b->distanceLy;
        });

        return array_slice($results, 0, $limit);
    }

    /**
     * Get stars with confirmed exoplanets.
     *
     * @return array<Star>
     */
    public function withExoplanets(): array
    {
        $this->ensureLoaded();

        return array_values(
            array_filter(
                $this->stars,
                fn(Star $star) => $star->hasConfirmedPlanets()
            )
        );
    }

    /**
     * Get all stars in the catalog.
     *
     * @return array<string, Star>
     */
    public function all(): array
    {
        $this->ensureLoaded();
        return $this->stars;
    }

    /**
     * Get the total number of stars in the catalog.
     */
    public function count(): int
    {
        $this->ensureLoaded();
        return count($this->stars);
    }

    /**
     * Get catalog metadata (sources, stats, etc.).
     *
     * @return array<string, mixed>
     */
    public function metadata(): array
    {
        $this->ensureLoaded();
        return $this->meta ?? [];
    }

    /**
     * Load the catalog from JSON file.
     */
    private function ensureLoaded(): void
    {
        if ($this->stars !== null) {
            return;
        }

        if (! file_exists($this->catalogPath)) {
            throw new \RuntimeException(
                "Star catalog not found at: {$this->catalogPath}"
            );
        }

        $json = file_get_contents($this->catalogPath);
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        $this->stars = [];
        $this->starsByName = [];

        // Handle new format with _meta and stars keys
        if (isset($data['_meta'])) {
            $this->meta = $data['_meta'];
            $starsData = $data['stars'] ?? [];
        } else {
            // Legacy format: flat structure
            $starsData = $data;
        }

        foreach ($starsData as $id => $starData) {
            $star = Star::fromArray($id, $starData);
            $this->stars[$id] = $star;

            if ($star->name !== null) {
                $this->starsByName[strtolower($star->name)] = $star;
            }

            // Also index by Bayer-Flamsteed designation if present
            if (isset($starData['bayer_flamsteed'])) {
                $this->starsByName[strtolower($starData['bayer_flamsteed'])] = $star;
            }
        }
    }
}
