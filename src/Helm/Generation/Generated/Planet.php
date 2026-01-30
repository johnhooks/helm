<?php

declare(strict_types=1);

namespace Helm\Generation\Generated;

use Helm\Generation\PlanetType;

/**
 * Generated planet value object.
 *
 * Can represent either a confirmed exoplanet (from real data) or a generated planet.
 */
final class Planet
{
    /**
     * @param string $id Unique identifier
     * @param PlanetType $type Planet type
     * @param int $orbitIndex Orbital position (0 = closest to star)
     * @param float $orbitAu Distance from star in AU
     * @param array<string, int> $resources Resource type => richness (1-100)
     * @param bool $habitable Whether the planet could support life
     * @param int $moons Number of moons
     * @param string|null $name Planet name (for confirmed planets)
     * @param float|null $radiusEarth Radius in Earth radii
     * @param float|null $massEarth Mass in Earth masses
     * @param float|null $orbitalPeriodDays Orbital period in days
     * @param float|null $equilibriumTempK Equilibrium temperature in Kelvin
     * @param bool $confirmed Whether this is a confirmed exoplanet from real data
     */
    public function __construct(
        public readonly string $id,
        public readonly PlanetType $type,
        public readonly int $orbitIndex,
        public readonly float $orbitAu,
        public readonly array $resources = [],
        public readonly bool $habitable = false,
        public readonly int $moons = 0,
        public readonly ?string $name = null,
        public readonly ?float $radiusEarth = null,
        public readonly ?float $massEarth = null,
        public readonly ?float $orbitalPeriodDays = null,
        public readonly ?float $equilibriumTempK = null,
        public readonly bool $confirmed = false,
    ) {
    }

    /**
     * Create from array data.
     *
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            type: PlanetType::from($data['type']),
            orbitIndex: $data['orbit_index'],
            orbitAu: $data['orbit_au'],
            resources: $data['resources'] ?? [],
            habitable: $data['habitable'] ?? false,
            moons: $data['moons'] ?? 0,
            name: $data['name'] ?? null,
            radiusEarth: $data['radius_earth'] ?? null,
            massEarth: $data['mass_earth'] ?? null,
            orbitalPeriodDays: $data['orbital_period_days'] ?? null,
            equilibriumTempK: $data['equilibrium_temp_k'] ?? null,
            confirmed: $data['confirmed'] ?? false,
        );
    }

    /**
     * Create from confirmed exoplanet data in star catalog.
     *
     * @param string $starId The parent star ID
     * @param int $orbitIndex Orbital position
     * @param array<string, mixed> $planetData Data from star catalog
     */
    public static function fromConfirmed(string $starId, int $orbitIndex, array $planetData): self
    {
        $radiusEarth = $planetData['radius_earth'] ?? null;
        $massEarth = $planetData['mass_earth'] ?? null;
        $orbitAu = $planetData['semi_major_axis_au'] ?? 1.0;
        $equilibriumTempK = $planetData['equilibrium_temp_k'] ?? null;

        return new self(
            id: $starId . '_' . self::slugifyName($planetData['name'] ?? 'P' . ($orbitIndex + 1)),
            type: self::inferType($radiusEarth, $massEarth, $orbitAu, $equilibriumTempK),
            orbitIndex: $orbitIndex,
            orbitAu: (float) $orbitAu,
            resources: [], // Will be generated later
            habitable: self::inferHabitable($radiusEarth, $massEarth, $equilibriumTempK),
            moons: 0, // Will be generated later
            name: $planetData['name'] ?? null,
            radiusEarth: $radiusEarth !== null ? (float) $radiusEarth : null,
            massEarth: $massEarth !== null ? (float) $massEarth : null,
            orbitalPeriodDays: isset($planetData['orbital_period_days']) ? (float) $planetData['orbital_period_days'] : null,
            equilibriumTempK: $equilibriumTempK !== null ? (float) $equilibriumTempK : null,
            confirmed: true,
        );
    }

    /**
     * Infer planet type from physical properties.
     */
    private static function inferType(?float $radiusEarth, ?float $massEarth, float $orbitAu, ?float $tempK): PlanetType
    {
        // Use radius if available (most reliable)
        if ($radiusEarth !== null) {
            if ($radiusEarth > 10) {
                // Hot Jupiter if close-in and large
                if ($orbitAu < 0.1) {
                    return PlanetType::HotJupiter;
                }
                return PlanetType::GasGiant;
            }
            if ($radiusEarth > 4) {
                return PlanetType::IceGiant;
            }
            if ($radiusEarth > 2) {
                return PlanetType::MiniNeptune;
            }
            if ($radiusEarth > 1.25) {
                return PlanetType::SuperEarth;
            }
            // Small rocky planet - check temperature
            if ($tempK !== null && $tempK > 800) {
                return PlanetType::Molten;
            }
            if ($tempK !== null && $tempK < 150) {
                return PlanetType::Frozen;
            }
            return PlanetType::Terrestrial;
        }

        // Fall back to mass if no radius
        if ($massEarth !== null) {
            if ($massEarth > 300) {
                if ($orbitAu < 0.1) {
                    return PlanetType::HotJupiter;
                }
                return PlanetType::GasGiant;
            }
            if ($massEarth > 15) {
                return PlanetType::IceGiant;
            }
            if ($massEarth > 5) {
                return PlanetType::MiniNeptune;
            }
            if ($massEarth > 1.5) {
                return PlanetType::SuperEarth;
            }
            return PlanetType::Terrestrial;
        }

        // No size data - use orbital distance
        if ($orbitAu < 0.1) {
            return PlanetType::Molten;
        }
        return PlanetType::Terrestrial;
    }

    /**
     * Infer habitability from physical properties.
     */
    private static function inferHabitable(?float $radiusEarth, ?float $massEarth, ?float $tempK): bool
    {
        // Temperature check - roughly 200K to 330K for liquid water
        if ($tempK !== null) {
            if ($tempK < 180 || $tempK > 350) {
                return false;
            }
        }

        // Size check - not too big (gas) or too small (no atmosphere)
        if ($radiusEarth !== null) {
            if ($radiusEarth < 0.5 || $radiusEarth > 2.5) {
                return false;
            }
        }

        if ($massEarth !== null) {
            if ($massEarth < 0.1 || $massEarth > 10) {
                return false;
            }
        }

        // If we have temperature in range and reasonable size, consider habitable
        return $tempK !== null && $tempK >= 180 && $tempK <= 350;
    }

    /**
     * Convert planet name to slug for ID.
     */
    private static function slugifyName(string $name): string
    {
        $slug = preg_replace('/[^a-zA-Z0-9]+/', '_', $name);
        return strtoupper(trim($slug, '_'));
    }

    /**
     * Check if this is a confirmed exoplanet.
     */
    public function isConfirmed(): bool
    {
        return $this->confirmed;
    }

    /**
     * Convert to array.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $data = [
            'id' => $this->id,
            'type' => $this->type->value,
            'orbit_index' => $this->orbitIndex,
            'orbit_au' => $this->orbitAu,
            'resources' => $this->resources,
            'habitable' => $this->habitable,
            'moons' => $this->moons,
        ];

        if ($this->name !== null) {
            $data['name'] = $this->name;
        }
        if ($this->radiusEarth !== null) {
            $data['radius_earth'] = $this->radiusEarth;
        }
        if ($this->massEarth !== null) {
            $data['mass_earth'] = $this->massEarth;
        }
        if ($this->orbitalPeriodDays !== null) {
            $data['orbital_period_days'] = $this->orbitalPeriodDays;
        }
        if ($this->equilibriumTempK !== null) {
            $data['equilibrium_temp_k'] = $this->equilibriumTempK;
        }
        if ($this->confirmed) {
            $data['confirmed'] = true;
        }

        return $data;
    }
}
