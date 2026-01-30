<?php

declare(strict_types=1);

namespace Helm\Generation\Generated;

use Helm\Generation\StationService;
use Helm\Generation\StationType;

/**
 * Generated station value object.
 */
final class Station
{
    /**
     * @param string $id Unique identifier
     * @param string $name Station name
     * @param StationType $type Station type
     * @param float $orbitAu Orbital distance in AU
     * @param string|null $orbitsPlanet Planet ID if orbiting a planet
     * @param array<StationService> $services Available services
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly StationType $type,
        public readonly float $orbitAu,
        public readonly ?string $orbitsPlanet = null,
        public readonly array $services = [],
    ) {
    }

    /**
     * Create from array data.
     *
     * @param array{id: string, name: string, type: string, orbit_au: float, orbits_planet?: string|null, services?: array<string>} $data
     */
    public static function fromArray(array $data): self
    {
        $services = array_map(
            static fn(string $s) => StationService::from($s),
            $data['services'] ?? []
        );

        return new self(
            id: $data['id'],
            name: $data['name'],
            type: StationType::from($data['type']),
            orbitAu: $data['orbit_au'],
            orbitsPlanet: $data['orbits_planet'] ?? null,
            services: $services,
        );
    }

    /**
     * Convert to array.
     *
     * @return array{id: string, name: string, type: string, orbit_au: float, orbits_planet: string|null, services: array<string>}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type->value,
            'orbit_au' => $this->orbitAu,
            'orbits_planet' => $this->orbitsPlanet,
            'services' => array_map(static fn(StationService $s) => $s->value, $this->services),
        ];
    }

    /**
     * Check if station provides a specific service.
     */
    public function hasService(StationService $service): bool
    {
        return in_array($service, $this->services, true);
    }
}
