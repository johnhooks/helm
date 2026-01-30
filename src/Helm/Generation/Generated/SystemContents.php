<?php

declare(strict_types=1);

namespace Helm\Generation\Generated;

/**
 * Container for all generated system contents.
 *
 * This is the result of generating a star system. It contains
 * all planets, belts, stations, and anomalies in the system.
 */
final class SystemContents
{
    /**
     * @param string $starId The star this system belongs to
     * @param int $algorithmVersion Version of generation algorithm used
     * @param array<Planet> $planets Generated planets
     * @param array<AsteroidBelt> $asteroidBelts Generated asteroid belts
     * @param array<Station> $stations Generated stations
     * @param array<Anomaly> $anomalies Generated anomalies
     */
    public function __construct(
        public readonly string $starId,
        public readonly int $algorithmVersion,
        public readonly array $planets = [],
        public readonly array $asteroidBelts = [],
        public readonly array $stations = [],
        public readonly array $anomalies = [],
    ) {
    }

    /**
     * Generate a content hash for verification.
     *
     * Same seed + same algorithm = same hash.
     */
    public function hash(): string
    {
        return hash('sha256', json_encode($this->toArray(), JSON_THROW_ON_ERROR));
    }

    /**
     * Convert to array format.
     *
     * @return array{
     *     star_id: string,
     *     algorithm_version: int,
     *     planets: array<array<string, mixed>>,
     *     asteroid_belts: array<array<string, mixed>>,
     *     stations: array<array<string, mixed>>,
     *     anomalies: array<array<string, mixed>>
     * }
     */
    public function toArray(): array
    {
        return [
            'star_id' => $this->starId,
            'algorithm_version' => $this->algorithmVersion,
            'planets' => array_map(fn(Planet $p) => $p->toArray(), $this->planets),
            'asteroid_belts' => array_map(fn(AsteroidBelt $b) => $b->toArray(), $this->asteroidBelts),
            'stations' => array_map(fn(Station $s) => $s->toArray(), $this->stations),
            'anomalies' => array_map(fn(Anomaly $a) => $a->toArray(), $this->anomalies),
        ];
    }

    /**
     * Create from array data.
     *
     * @param array{
     *     star_id: string,
     *     algorithm_version: int,
     *     planets?: array<array<string, mixed>>,
     *     asteroid_belts?: array<array<string, mixed>>,
     *     stations?: array<array<string, mixed>>,
     *     anomalies?: array<array<string, mixed>>
     * } $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            starId: $data['star_id'],
            algorithmVersion: $data['algorithm_version'],
            planets: array_map(
                fn(array $p) => Planet::fromArray($p),
                $data['planets'] ?? []
            ),
            asteroidBelts: array_map(
                fn(array $b) => AsteroidBelt::fromArray($b),
                $data['asteroid_belts'] ?? []
            ),
            stations: array_map(
                fn(array $s) => Station::fromArray($s),
                $data['stations'] ?? []
            ),
            anomalies: array_map(
                fn(array $a) => Anomaly::fromArray($a),
                $data['anomalies'] ?? []
            ),
        );
    }

    /**
     * Check if the system has any content.
     */
    public function isEmpty(): bool
    {
        return $this->planets === []
            && $this->asteroidBelts === []
            && $this->stations === []
            && $this->anomalies === [];
    }

    /**
     * Get total number of objects in the system.
     */
    public function objectCount(): int
    {
        return count($this->planets)
            + count($this->asteroidBelts)
            + count($this->stations)
            + count($this->anomalies);
    }
}
