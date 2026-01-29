<?php

declare(strict_types=1);

namespace Helm\Generation\Generated;

/**
 * Generated station value object.
 */
final class Station
{
    public const TYPE_TRADING = 'trading';
    public const TYPE_MINING = 'mining';
    public const TYPE_RESEARCH = 'research';
    public const TYPE_MILITARY = 'military';
    public const TYPE_REFUELING = 'refueling';

    public const SERVICE_TRADE = 'trade';
    public const SERVICE_REPAIR = 'repair';
    public const SERVICE_REFUEL = 'refuel';
    public const SERVICE_UPGRADE = 'upgrade';
    public const SERVICE_MISSIONS = 'missions';

    /**
     * @param string $id Unique identifier
     * @param string $name Station name
     * @param string $type Station type
     * @param float $orbitAu Orbital distance in AU
     * @param string|null $orbitsPlanet Planet ID if orbiting a planet
     * @param array<string> $services Available services
     */
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly string $type,
        public readonly float $orbitAu,
        public readonly ?string $orbitsPlanet = null,
        public readonly array $services = [],
    ) {}

    /**
     * Create from array data.
     *
     * @param array{id: string, name: string, type: string, orbit_au: float, orbits_planet?: string|null, services?: array<string>} $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            name: $data['name'],
            type: $data['type'],
            orbitAu: $data['orbit_au'],
            orbitsPlanet: $data['orbits_planet'] ?? null,
            services: $data['services'] ?? [],
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
            'type' => $this->type,
            'orbit_au' => $this->orbitAu,
            'orbits_planet' => $this->orbitsPlanet,
            'services' => $this->services,
        ];
    }

    /**
     * Check if station provides a specific service.
     */
    public function hasService(string $service): bool
    {
        return in_array($service, $this->services, true);
    }
}
