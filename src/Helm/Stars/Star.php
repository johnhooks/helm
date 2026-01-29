<?php

declare(strict_types=1);

namespace Helm\Stars;

/**
 * Star value object.
 *
 * Represents a real star from the HYG catalog with NASA exoplanet data.
 */
final class Star
{
    /**
     * @param string $id Catalog ID (e.g., 'HIP_70890', 'SOL')
     * @param string|null $name Common name (e.g., 'Proxima Centauri')
     * @param string $spectralType Spectral classification (e.g., 'M5Ve')
     * @param float $distanceLy Distance from Sol in light years
     * @param float $ra Right ascension in degrees (J2000)
     * @param float $dec Declination in degrees (J2000)
     * @param array{
     *     hip?: int,
     *     hd?: int,
     *     hr?: int,
     *     gl?: string,
     *     bayer_flamsteed?: string,
     *     constellation?: string,
     *     x?: float,
     *     y?: float,
     *     z?: float,
     *     proper_motion_ra?: float,
     *     proper_motion_dec?: float,
     *     radial_velocity?: float,
     *     apparent_mag?: float,
     *     absolute_mag?: float,
     *     luminosity_solar?: float,
     *     color_index?: float,
     *     temperature_k?: int,
     *     mass_solar?: float,
     *     radius_solar?: float,
     *     age_gyr?: float,
     *     component_count?: int,
     *     is_primary?: bool,
     *     system_id?: string,
     *     variable_type?: string,
     * } $properties Physical and catalog properties
     * @param array<array{
     *     name: string,
     *     orbital_period_days?: float,
     *     semi_major_axis_au?: float,
     *     radius_earth?: float,
     *     mass_earth?: float,
     *     equilibrium_temp_k?: int
     * }> $confirmedPlanets Confirmed exoplanets from NASA archive
     */
    public function __construct(
        public readonly string $id,
        public readonly ?string $name,
        public readonly string $spectralType,
        public readonly float $distanceLy,
        public readonly float $ra,
        public readonly float $dec,
        public readonly array $properties = [],
        public readonly array $confirmedPlanets = [],
    ) {}

    /**
     * Create from catalog data array.
     */
    public static function fromArray(string $id, array $data): self
    {
        // Build properties from flat structure
        $properties = [];
        $propertyKeys = [
            'hip', 'hd', 'hr', 'gl', 'bayer_flamsteed', 'constellation',
            'x', 'y', 'z', 'proper_motion_ra', 'proper_motion_dec', 'radial_velocity',
            'apparent_mag', 'absolute_mag', 'luminosity_solar', 'color_index',
            'temperature_k', 'mass_solar', 'radius_solar', 'age_gyr',
            'component_count', 'is_primary', 'system_id', 'variable_type',
        ];

        foreach ($propertyKeys as $key) {
            if (isset($data[$key])) {
                $properties[$key] = $data[$key];
            }
        }

        return new self(
            id: $id,
            name: $data['name'] ?? null,
            spectralType: $data['spectral_type'] ?? $data['spectralType'] ?? 'Unknown',
            distanceLy: (float) ($data['distance_ly'] ?? $data['distanceLy'] ?? 0),
            ra: (float) ($data['ra'] ?? 0),
            dec: (float) ($data['dec'] ?? 0),
            properties: $properties,
            confirmedPlanets: $data['confirmed_planets'] ?? [],
        );
    }

    /**
     * Get the display name (common name or ID).
     */
    public function displayName(): string
    {
        return $this->name ?? $this->id;
    }

    /**
     * Get the spectral class (first letter of spectral type).
     */
    public function spectralClass(): string
    {
        $type = $this->spectralType;
        if (preg_match('/^([OBAFGKM])/', $type, $matches)) {
            return $matches[1];
        }
        return 'Unknown';
    }

    /**
     * Get the spectral subtype (e.g., 5 for G5V).
     */
    public function spectralSubtype(): ?int
    {
        if (preg_match('/^[OBAFGKM](\d)/', $this->spectralType, $matches)) {
            return (int) $matches[1];
        }
        return null;
    }

    /**
     * Check if this star has confirmed exoplanets.
     */
    public function hasConfirmedPlanets(): bool
    {
        return count($this->confirmedPlanets) > 0;
    }

    /**
     * Get the number of confirmed planets.
     */
    public function confirmedPlanetCount(): int
    {
        return count($this->confirmedPlanets);
    }

    /**
     * Check if this is Sol (our Sun).
     */
    public function isSol(): bool
    {
        return $this->id === 'SOL';
    }

    /**
     * Get luminosity in solar units.
     */
    public function luminosity(): ?float
    {
        return $this->properties['luminosity_solar'] ?? null;
    }

    /**
     * Get mass in solar units.
     */
    public function mass(): ?float
    {
        return $this->properties['mass_solar'] ?? null;
    }

    /**
     * Get radius in solar units.
     */
    public function radius(): ?float
    {
        return $this->properties['radius_solar'] ?? null;
    }

    /**
     * Get surface temperature in Kelvin.
     */
    public function temperature(): ?int
    {
        return $this->properties['temperature_k'] ?? null;
    }

    /**
     * Get 3D position in parsecs from Sol.
     *
     * @return array{x: float, y: float, z: float}|null
     */
    public function position3D(): ?array
    {
        if (isset($this->properties['x'], $this->properties['y'], $this->properties['z'])) {
            return [
                'x' => $this->properties['x'],
                'y' => $this->properties['y'],
                'z' => $this->properties['z'],
            ];
        }
        return null;
    }

    /**
     * Check if this star is part of a multi-star system.
     */
    public function isMultiStarSystem(): bool
    {
        return ($this->properties['component_count'] ?? 1) > 1;
    }

    /**
     * Check if this is the primary star in its system.
     */
    public function isPrimary(): bool
    {
        return $this->properties['is_primary'] ?? true;
    }

    /**
     * Check if this is a variable star.
     */
    public function isVariable(): bool
    {
        return isset($this->properties['variable_type']);
    }

    /**
     * Get 3D Cartesian coordinates in light-years from Sol.
     *
     * Converts RA/Dec/Distance (spherical) to X/Y/Z (Cartesian).
     * Sol is at origin (0, 0, 0).
     *
     * Coordinate system:
     * - X: toward vernal equinox (RA=0, Dec=0)
     * - Y: perpendicular in equatorial plane (RA=90°, Dec=0)
     * - Z: toward celestial north pole (Dec=90°)
     *
     * @return array{0: float, 1: float, 2: float} [x, y, z] in light-years
     */
    public function cartesian3D(): array
    {
        // Sol is the origin
        if ($this->isSol()) {
            return [0.0, 0.0, 0.0];
        }

        // If we have pre-calculated coordinates in properties, use them
        $pos = $this->position3D();
        if ($pos !== null) {
            // Properties may store in parsecs, but we need consistency
            // For now, assume they're already in light-years
            return [$pos['x'], $pos['y'], $pos['z']];
        }

        // Calculate from RA/Dec/Distance
        // RA is stored in degrees (0-360)
        // Dec is stored in degrees (-90 to +90)
        $raRadians = deg2rad($this->ra);
        $decRadians = deg2rad($this->dec);

        $x = $this->distanceLy * cos($decRadians) * cos($raRadians);
        $y = $this->distanceLy * cos($decRadians) * sin($raRadians);
        $z = $this->distanceLy * sin($decRadians);

        return [$x, $y, $z];
    }
}
