<?php

declare(strict_types=1);

namespace Helm\Generation;

use Helm\Generation\Generated\Anomaly;
use Helm\Generation\Generated\AsteroidBelt;
use Helm\Generation\Generated\Planet;
use Helm\Generation\Generated\Station;
use Helm\Generation\Generated\SystemContents;
use Helm\Origin\SeededRandom;
use Helm\Stars\Star;

// phpcs:disable Squiz.Arrays.ArrayDeclaration.KeySpecified

/**
 * Generates star system contents deterministically.
 *
 * Given the same star and master seed, always produces identical results.
 *
 * Note: Stations and anomalies are NOT generated here.
 * - Stations are placed deliberately (Sol, megacorp empire, player-built outposts)
 * - Anomalies are event-driven (narrative engine for dynamic storytelling)
 */
final class SystemGenerator
{
    public const ALGORITHM_VERSION = 1;

    /**
     * Generate system contents for a star.
     */
    public function generate(Star $star, string $masterSeed): SystemContents
    {
        // Sol uses real solar system data
        if ($star->isSol()) {
            return $this->loadSolSystem();
        }

        $seed = $this->generateSeed($star, $masterSeed);
        $rng = new SeededRandom($seed);

        $planets = $this->generatePlanets($star, $rng);
        $belts = $this->generateAsteroidBelts($star, $rng, $planets);

        // Stations are placed deliberately (Sol, megacorp systems, player-built)
        // Anomalies are event-driven (narrative engine, not static generation)

        return new SystemContents(
            starId: $star->id,
            algorithmVersion: self::ALGORITHM_VERSION,
            planets: $planets,
            asteroidBelts: $belts,
            stations: [],
            anomalies: [],
        );
    }

    /**
     * Load the real Solar System data.
     */
    private function loadSolSystem(): SystemContents
    {
        $path = HELM_PATH . 'data/sol-system.json';

        if (! file_exists($path)) {
            throw new \RuntimeException('Sol system data not found: ' . $path);
        }

        $json = file_get_contents($path);
        $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        $planets = array_map(
            fn(array $p) => Planet::fromArray($p),
            $data['system']['planets'] ?? []
        );

        $belts = array_map(
            fn(array $b) => AsteroidBelt::fromArray($b),
            $data['system']['asteroid_belts'] ?? []
        );

        $stations = array_map(
            fn(array $s) => Station::fromArray($s),
            $data['system']['stations'] ?? []
        );

        $anomalies = array_map(
            fn(array $a) => Anomaly::fromArray($a),
            $data['system']['anomalies'] ?? []
        );

        return new SystemContents(
            starId: 'SOL',
            algorithmVersion: self::ALGORITHM_VERSION,
            planets: $planets,
            asteroidBelts: $belts,
            stations: $stations,
            anomalies: $anomalies,
        );
    }

    /**
     * Generate a deterministic seed for a star system.
     */
    public function generateSeed(Star $star, string $masterSeed): string
    {
        return hash(
            'sha256',
            $masterSeed . ':' . $star->id . ':v' . self::ALGORITHM_VERSION
        );
    }

    /**
     * Generate planets based on star properties.
     *
     * Uses confirmed exoplanets from real data and fills in gaps with generated planets.
     *
     * @return array<Planet>
     */
    private function generatePlanets(Star $star, SeededRandom $rng): array
    {
        // Start with confirmed planets from real data
        $confirmedPlanets = $this->loadConfirmedPlanets($star);

        // If star has confirmed planets, build around them
        if ($confirmedPlanets !== []) {
            return $this->buildSystemAroundConfirmed($star, $confirmedPlanets, $rng);
        }

        // No confirmed planets - generate entirely
        return $this->generateFullSystem($star, $rng);
    }

    /**
     * Load confirmed planets from star data.
     *
     * @return array<Planet>
     */
    private function loadConfirmedPlanets(Star $star): array
    {
        $confirmedData = $star->properties['confirmed_planets'] ?? [];

        if ($confirmedData === []) {
            return [];
        }

        $planets = [];
        foreach ($confirmedData as $index => $planetData) {
            $planets[] = Planet::fromConfirmed($star->id, $index, $planetData);
        }

        // Sort by orbital distance
        usort($planets, fn(Planet $a, Planet $b) => $a->orbitAu <=> $b->orbitAu);

        return $planets;
    }

    /**
     * Build a system around confirmed planets, filling gaps.
     *
     * @param array<Planet> $confirmed
     * @return array<Planet>
     */
    private function buildSystemAroundConfirmed(Star $star, array $confirmed, SeededRandom $rng): array
    {
        $innerHz = $this->innerHabitableZone($star);
        $allPlanets = [];

        // How many total planets should this system have?
        $targetCount = $this->basePlanetCount($star);
        $targetCount = $rng->between($targetCount - 1, $targetCount + 2);
        $targetCount = max(count($confirmed), min(12, $targetCount));

        // Calculate how many to generate
        $toGenerate = $targetCount - count($confirmed);

        // Find gaps where we can add planets
        $gaps = $this->findOrbitalGaps($star, $confirmed, $rng);

        // Generate planets to fill gaps (up to our target)
        $generated = [];
        $gapsToFill = min($toGenerate, count($gaps));

        for ($i = 0; $i < $gapsToFill; $i++) {
            $gap = $gaps[$i];
            $type = $this->determinePlanetType($star, $gap['au'], $rng);

            $generated[] = new Planet(
                id: $star->id . '_G' . ($i + 1),
                type: $type,
                orbitIndex: 0, // Will be reassigned
                orbitAu: round($gap['au'], 3),
                resources: $this->generatePlanetResources($type, $rng),
                habitable: $this->isHabitable($star, $gap['au'], $type),
                moons: $this->generateMoonCount($type, $rng),
                radiusEarth: $this->generateRadius($type, $rng),
                massEarth: $this->generateMass($type, $rng),
            );
        }

        // Merge confirmed and generated, sort by orbit
        $allPlanets = array_merge($confirmed, $generated);
        usort($allPlanets, fn(Planet $a, Planet $b) => $a->orbitAu <=> $b->orbitAu);

        // Reassign orbit indices and add resources/moons to confirmed planets
        $result = [];
        foreach ($allPlanets as $index => $planet) {
            if ($planet->isConfirmed()) {
                // Confirmed planet - add generated resources and moons
                $result[] = new Planet(
                    id: $planet->id,
                    type: $planet->type,
                    orbitIndex: $index,
                    orbitAu: $planet->orbitAu,
                    resources: $this->generatePlanetResources($planet->type, $rng),
                    habitable: $planet->habitable,
                    moons: $this->generateMoonCount($planet->type, $rng),
                    name: $planet->name,
                    radiusEarth: $planet->radiusEarth,
                    massEarth: $planet->massEarth,
                    orbitalPeriodDays: $planet->orbitalPeriodDays,
                    equilibriumTempK: $planet->equilibriumTempK,
                    confirmed: true,
                );
            } else {
                // Generated planet - update orbit index
                $result[] = new Planet(
                    id: $planet->id,
                    type: $planet->type,
                    orbitIndex: $index,
                    orbitAu: $planet->orbitAu,
                    resources: $planet->resources,
                    habitable: $planet->habitable,
                    moons: $planet->moons,
                    radiusEarth: $planet->radiusEarth,
                    massEarth: $planet->massEarth,
                );
            }
        }

        return $result;
    }

    /**
     * Find orbital gaps where additional planets could exist.
     *
     * Uses the ~1.76:1 orbital spacing ratio observed in real systems.
     *
     * @param array<Planet> $confirmed
     * @return array<array{au: float, location: string}>
     */
    private function findOrbitalGaps(Star $star, array $confirmed, SeededRandom $rng): array
    {
        $gaps = [];
        $innerHz = $this->innerHabitableZone($star);

        // Orbital spacing ratio (Kepler systems show ~1.76:1)
        $spacingRatio = 1.76;
        $minSpacing = 1.4; // Minimum stable spacing

        // Check for inner planets (inside first confirmed)
        if ($confirmed !== []) {
            $innermost = $confirmed[0]->orbitAu;
            $innerCheck = $innermost / $spacingRatio;

            // Can we fit a planet inside?
            while ($innerCheck > $innerHz * 0.2 && $innerCheck > 0.03) {
                $gaps[] = ['au' => $innerCheck, 'location' => 'inner'];
                $innerCheck /= $spacingRatio;
            }
        }

        // Check gaps between confirmed planets
        for ($i = 0; $i < count($confirmed) - 1; $i++) {
            $inner = $confirmed[$i]->orbitAu;
            $outer = $confirmed[$i + 1]->orbitAu;
            $ratio = $outer / $inner;

            // If gap is large enough for a planet
            if ($ratio > $spacingRatio * $minSpacing) {
                // Place planet(s) in the gap
                $gapAu = $inner * $spacingRatio;
                while ($gapAu < $outer / $minSpacing) {
                    $gaps[] = ['au' => $gapAu, 'location' => 'between'];
                    $gapAu *= $spacingRatio;
                }
            }
        }

        // Check for outer planets
        if ($confirmed !== []) {
            $outermost = end($confirmed)->orbitAu;
            $outerCheck = $outermost * $spacingRatio;
            $maxAu = $innerHz * 30; // Reasonable outer limit

            while ($outerCheck < $maxAu && count($gaps) < 8) {
                $gaps[] = ['au' => $outerCheck, 'location' => 'outer'];
                $outerCheck *= $spacingRatio;
            }
        }

        // Shuffle gaps and return (so we don't always fill the same ones)
        return $rng->shuffle($gaps);
    }

    /**
     * Generate a full planetary system (no confirmed planets).
     *
     * @return array<Planet>
     */
    private function generateFullSystem(Star $star, SeededRandom $rng): array
    {
        // Planet count influenced by spectral type
        $basePlanets = $this->basePlanetCount($star);
        $planetCount = $rng->between($basePlanets - 2, $basePlanets + 2);
        $planetCount = max(0, min(12, $planetCount));

        $planets = [];
        $currentAu = $this->innerHabitableZone($star) * 0.3; // Start inside habitable zone

        for ($i = 0; $i < $planetCount; $i++) {
            // Increase orbital distance using realistic spacing
            // Real systems show ~1.76:1 ratio with some variation
            $currentAu *= $rng->between(150, 200) / 100;

            $type = $this->determinePlanetType($star, $currentAu, $rng);
            $habitable = $this->isHabitable($star, $currentAu, $type);

            $planets[] = new Planet(
                id: $star->id . '_P' . ($i + 1),
                type: $type,
                orbitIndex: $i,
                orbitAu: round($currentAu, 3),
                resources: $this->generatePlanetResources($type, $rng),
                habitable: $habitable,
                moons: $this->generateMoonCount($type, $rng),
                radiusEarth: $this->generateRadius($type, $rng),
                massEarth: $this->generateMass($type, $rng),
            );
        }

        return $planets;
    }

    /**
     * Generate asteroid belts.
     *
     * @param array<Planet> $planets
     * @return array<AsteroidBelt>
     */
    private function generateAsteroidBelts(Star $star, SeededRandom $rng, array $planets): array
    {
        $belts = [];

        // 35% chance of at least one belt
        if (! $rng->chance(350)) {
            return $belts;
        }

        // Most systems with belts have 1, fewer have 2, rare to have 3
        $roll = $rng->between(1, 100);
        $beltCount = match (true) {
            $roll <= 60 => 1,  // 60%
            $roll <= 90 => 2,  // 30%
            default => 3,      // 10%
        };

        for ($i = 0; $i < $beltCount; $i++) {
            // Place belt between planets or at outer edge
            $innerAu = $this->findBeltLocation($planets, $rng);
            $width = $rng->between(5, 20) / 10; // 0.5 to 2.0 AU wide
            $outerAu = $innerAu + $width;

            $type = $rng->pick([
                AsteroidBeltType::Rocky,
                AsteroidBeltType::Metallic,
                AsteroidBeltType::Icy,
                AsteroidBeltType::Mixed,
            ]);

            $density = $rng->between(20, 80);

            $belts[] = new AsteroidBelt(
                id: $star->id . '_BELT' . ($i + 1),
                type: $type,
                innerAu: round($innerAu, 2),
                outerAu: round($outerAu, 2),
                density: $density,
                resources: $this->generateBeltResources($type, $density, $rng),
            );
        }

        return $belts;
    }

    /**
     * Get base planet count for a spectral type.
     */
    private function basePlanetCount(Star $star): int
    {
        return match ($star->spectralClass()) {
            'O', 'B' => 2, // Hot, young stars - fewer planets
            'A' => 4,
            'F' => 6,
            'G' => 8, // Sun-like - most planets
            'K' => 6,
            'M' => 4, // Red dwarfs - fewer planets
            default => 5,
        };
    }

    /**
     * Calculate inner edge of habitable zone in AU.
     */
    private function innerHabitableZone(Star $star): float
    {
        $luminosity = $star->properties['luminosity_solar'] ?? 1.0;
        return sqrt($luminosity) * 0.95;
    }

    /**
     * Determine planet type based on distance from star.
     *
     * Incorporates patterns from exoplanet data:
     * - Hot Jupiters can exist very close to stars
     * - Mini-Neptunes are common in intermediate zones
     * - Size gradient: smaller planets closer in, larger further out
     */
    private function determinePlanetType(Star $star, float $au, SeededRandom $rng): PlanetType
    {
        // ~1% chance of a mystery planet (gives ~5% of systems with one)
        if ($rng->chance(10)) {
            return $rng->pick([PlanetType::Anomalous, PlanetType::Void]);
        }

        $innerHz = $this->innerHabitableZone($star);
        $outerHz = $innerHz * 1.5;

        if ($au < 0.1) {
            // Very close - hot Jupiters possible but rare
            if ($rng->chance(100)) { // 10% chance of hot Jupiter
                return PlanetType::HotJupiter;
            }
            return $rng->pick([PlanetType::Molten, PlanetType::Terrestrial]);
        }

        if ($au < $innerHz * 0.5) {
            // Close to star
            return $rng->pick([
                PlanetType::Molten,
                PlanetType::Terrestrial,
                PlanetType::SuperEarth,
            ]);
        }

        if ($au < $innerHz) {
            // Inside habitable zone - mini-Neptunes common here
            return $rng->pick([
                PlanetType::Terrestrial,
                PlanetType::SuperEarth,
                PlanetType::MiniNeptune,
            ]);
        }

        if ($au <= $outerHz) {
            // In habitable zone - favor rocky planets
            return $rng->pick([
                PlanetType::Terrestrial,
                PlanetType::Terrestrial,
                PlanetType::SuperEarth,
            ]);
        }

        if ($au < $outerHz * 2) {
            // Just outside habitable zone
            return $rng->pick([
                PlanetType::SuperEarth,
                PlanetType::MiniNeptune,
                PlanetType::IceGiant,
            ]);
        }

        if ($au < $outerHz * 5) {
            // Outer system
            return $rng->pick([
                PlanetType::GasGiant,
                PlanetType::GasGiant,
                PlanetType::IceGiant,
            ]);
        }

        // Far outer system
        return $rng->pick([
            PlanetType::IceGiant,
            PlanetType::Frozen,
            PlanetType::Dwarf,
        ]);
    }

    /**
     * Check if a planet could be habitable.
     */
    private function isHabitable(Star $star, float $au, PlanetType $type): bool
    {
        // Only rocky/terrestrial planets can be habitable
        if (! $type->canBeHabitable()) {
            return false;
        }

        $innerHz = $this->innerHabitableZone($star);
        $outerHz = $innerHz * 1.5;

        return $au >= $innerHz && $au <= $outerHz;
    }

    /**
     * Generate resources for a planet.
     *
     * Uses rarity-based weighted selection: common resources are much more likely
     * to appear than rare ones.
     *
     * @return array<string, int>
     */
    private function generatePlanetResources(PlanetType $type, SeededRandom $rng): array
    {
        $available = match ($type) {
            PlanetType::Terrestrial, PlanetType::SuperEarth => [
                ResourceType::IronOre, ResourceType::CopperOre,
                ResourceType::TitaniumOre, ResourceType::RareEarthOre,
                ResourceType::WaterIce, ResourceType::Biomass, ResourceType::Proteins,
            ],
            PlanetType::GasGiant => [
                ResourceType::Hydrogen, ResourceType::Helium,
                ResourceType::Deuterium, ResourceType::Helium3,
            ],
            PlanetType::HotJupiter => [
                ResourceType::Hydrogen, ResourceType::Helium, ResourceType::ExoticGas,
            ],
            PlanetType::IceGiant, PlanetType::Frozen => [
                ResourceType::WaterIce, ResourceType::AmmoniaIce,
                ResourceType::MethaneIce, ResourceType::NitrogenIce,
                ResourceType::Hydrogen, ResourceType::Helium,
            ],
            PlanetType::MiniNeptune => [
                ResourceType::WaterIce, ResourceType::Hydrogen,
                ResourceType::Helium, ResourceType::Nitrogen,
            ],
            PlanetType::Molten => [
                ResourceType::IronOre, ResourceType::NickelOre, ResourceType::TitaniumOre,
                ResourceType::PlatinumOre, ResourceType::GoldOre, ResourceType::UraniumOre,
            ],
            PlanetType::Dwarf => [
                ResourceType::IronOre, ResourceType::NickelOre,
                ResourceType::WaterIce, ResourceType::Crystals,
            ],
            PlanetType::Rogue => [
                ResourceType::WaterIce, ResourceType::NitrogenIce,
                ResourceType::MethaneIce, ResourceType::IronOre,
            ],
            PlanetType::Anomalous => [
                ResourceType::ExoticOre, ResourceType::ExoticGas,
                ResourceType::Crystals, ResourceType::RareCompounds,
            ],
            PlanetType::Void => [
                ResourceType::ExoticOre, ResourceType::ExoticGas,
                ResourceType::AlienTissue, ResourceType::Crystals,
            ],
        };

        // Use weighted random selection based on rarity
        $resourceCount = $rng->between(1, 4);
        $selected = $this->weightedResourceSelection($available, $resourceCount, $rng);

        // Deposit size scales with planet type (larger planets = larger deposits)
        [$minDeposit, $maxDeposit] = $this->depositRangeForPlanetType($type);

        $resources = [];
        foreach ($selected as $resource) {
            $resources[$resource->value] = $rng->between($minDeposit, $maxDeposit);
        }

        return $resources;
    }

    /**
     * Get deposit size range based on planet type.
     *
     * Larger planets have larger deposits. Gas giants have massive gas reserves,
     * while dwarf planets have modest mineral deposits.
     *
     * @return array{int, int} [min, max]
     */
    private function depositRangeForPlanetType(PlanetType $type): array
    {
        return match ($type) {
            // Gas planets - massive reserves
            PlanetType::GasGiant => [60, 100],
            PlanetType::HotJupiter => [70, 100],
            PlanetType::IceGiant => [50, 90],
            PlanetType::MiniNeptune => [40, 80],

            // Large rocky planets
            PlanetType::SuperEarth => [40, 80],

            // Earth-sized
            PlanetType::Terrestrial => [30, 70],
            PlanetType::Frozen => [30, 60],
            PlanetType::Molten => [35, 75], // Dense, mineral-rich

            // Small bodies
            PlanetType::Dwarf => [15, 40],

            // Special types - unpredictable
            PlanetType::Rogue => [20, 60],
            PlanetType::Anomalous => [30, 80],
            PlanetType::Void => [40, 100], // Rings hold riches
        };
    }

    /**
     * Select resources using weighted random selection.
     *
     * Common resources (weight 100) are 50x more likely to be selected than
     * very rare ones (weight 2).
     *
     * @param array<ResourceType> $available
     * @param int $count
     * @return array<ResourceType>
     */
    private function weightedResourceSelection(array $available, int $count, SeededRandom $rng): array
    {
        $selected = [];
        $remaining = $available;

        for ($i = 0; $i < $count && $remaining !== []; $i++) {
            // Calculate total weight
            $totalWeight = 0;
            foreach ($remaining as $resource) {
                $totalWeight += $resource->rarity()->spawnWeight();
            }

            // Pick a random point in the weight range
            $roll = $rng->between(1, $totalWeight);

            // Find the resource at that point
            $cumulative = 0;
            foreach ($remaining as $index => $resource) {
                $cumulative += $resource->rarity()->spawnWeight();
                if ($roll <= $cumulative) {
                    $selected[] = $resource;
                    unset($remaining[$index]);
                    $remaining = array_values($remaining); // Re-index
                    break;
                }
            }
        }

        return $selected;
    }

    /**
     * Generate moon count for a planet.
     */
    private function generateMoonCount(PlanetType $type, SeededRandom $rng): int
    {
        return match ($type) {
            PlanetType::GasGiant, PlanetType::HotJupiter => $rng->between(4, 20),
            PlanetType::IceGiant => $rng->between(2, 10),
            PlanetType::MiniNeptune => $rng->between(1, 5),
            PlanetType::Terrestrial, PlanetType::SuperEarth => $rng->between(0, 2),
            PlanetType::Dwarf, PlanetType::Molten, PlanetType::Frozen => $rng->between(0, 1),
            PlanetType::Rogue => $rng->between(0, 3),
            PlanetType::Anomalous => $rng->between(0, 1),
            PlanetType::Void => 0, // Rings only, no moons
        };
    }

    /**
     * Generate realistic radius for a planet type.
     *
     * Applies the radius gap pattern: avoids 1.5-2.0 R⊕ (observed in real data).
     */
    private function generateRadius(PlanetType $type, SeededRandom $rng): float
    {
        $radius = match ($type) {
            PlanetType::GasGiant => $rng->between(900, 1400) / 100, // 9-14 R⊕
            PlanetType::HotJupiter => $rng->between(1000, 1600) / 100, // 10-16 R⊕ (inflated)
            PlanetType::IceGiant => $rng->between(350, 450) / 100, // 3.5-4.5 R⊕
            PlanetType::MiniNeptune => $rng->between(200, 350) / 100, // 2.0-3.5 R⊕ (above gap)
            PlanetType::SuperEarth => $rng->between(120, 150) / 100, // 1.2-1.5 R⊕ (below gap)
            PlanetType::Terrestrial => $rng->between(50, 120) / 100, // 0.5-1.2 R⊕
            PlanetType::Dwarf => $rng->between(20, 50) / 100, // 0.2-0.5 R⊕
            PlanetType::Molten => $rng->between(40, 100) / 100, // 0.4-1.0 R⊕
            PlanetType::Frozen => $rng->between(30, 80) / 100, // 0.3-0.8 R⊕
            PlanetType::Rogue => $rng->between(30, 150) / 100, // 0.3-1.5 R⊕ (varied)
            PlanetType::Anomalous => $rng->between(50, 200) / 100, // 0.5-2.0 R⊕ (unpredictable)
            PlanetType::Void => $rng->between(200, 500) / 100, // 2.0-5.0 R⊕ (large, ringed)
        };

        return round($radius, 2);
    }

    /**
     * Generate realistic mass for a planet type.
     *
     * Uses mass-radius relationship from exoplanet data.
     */
    private function generateMass(PlanetType $type, SeededRandom $rng): float
    {
        $mass = match ($type) {
            PlanetType::GasGiant => $rng->between(5000, 50000) / 100, // 50-500 M⊕
            PlanetType::HotJupiter => $rng->between(10000, 100000) / 100, // 100-1000 M⊕
            PlanetType::IceGiant => $rng->between(1000, 3000) / 100, // 10-30 M⊕
            PlanetType::MiniNeptune => $rng->between(500, 1500) / 100, // 5-15 M⊕
            PlanetType::SuperEarth => $rng->between(150, 500) / 100, // 1.5-5 M⊕
            PlanetType::Terrestrial => $rng->between(30, 200) / 100, // 0.3-2 M⊕
            PlanetType::Dwarf => $rng->between(1, 30) / 100, // 0.01-0.3 M⊕
            PlanetType::Molten => $rng->between(20, 150) / 100, // 0.2-1.5 M⊕
            PlanetType::Frozen => $rng->between(5, 50) / 100, // 0.05-0.5 M⊕
            PlanetType::Rogue => $rng->between(10, 200) / 100, // 0.1-2 M⊕ (varied)
            PlanetType::Anomalous => $rng->between(50, 300) / 100, // 0.5-3 M⊕ (unpredictable)
            PlanetType::Void => $rng->between(100, 1000) / 100, // 1-10 M⊕ (dense?)
        };

        return round($mass, 2);
    }

    /**
     * Find a location for an asteroid belt.
     *
     * @param array<Planet> $planets
     */
    private function findBeltLocation(array $planets, SeededRandom $rng): float
    {
        if ($planets === []) {
            return $rng->between(20, 50) / 10; // 2.0 to 5.0 AU
        }

        // Try to place between planets
        $lastPlanet = end($planets);
        return $lastPlanet->orbitAu * ($rng->between(110, 150) / 100);
    }

    /**
     * Generate resources for an asteroid belt.
     *
     * Uses rarity-based spawn rates: common resources (weight 100) have ~60% chance,
     * scaling down to very rare (weight 2) at ~1.2% chance.
     * Deposit sizes scale with belt density.
     *
     * @return array<string, int>
     */
    private function generateBeltResources(AsteroidBeltType $type, int $density, SeededRandom $rng): array
    {
        $resources = [];

        $available = match ($type) {
            AsteroidBeltType::Rocky => [
                ResourceType::IronOre, ResourceType::NickelOre, ResourceType::CopperOre,
            ],
            AsteroidBeltType::Metallic => [
                ResourceType::IronOre, ResourceType::NickelOre, ResourceType::TitaniumOre,
                ResourceType::PlatinumOre, ResourceType::RareEarthOre, ResourceType::GoldOre,
            ],
            AsteroidBeltType::Icy => [
                ResourceType::WaterIce, ResourceType::AmmoniaIce, ResourceType::MethaneIce,
                ResourceType::Hydrogen, ResourceType::NitrogenIce,
            ],
            AsteroidBeltType::Mixed => [
                ResourceType::IronOre, ResourceType::NickelOre,
                ResourceType::WaterIce, ResourceType::Crystals,
            ],
        };

        // Deposit size scales with density (20-80 density → deposits scale proportionally)
        // Sparse belt (20): 20-50, Dense belt (80): 50-100
        $minDeposit = (int) (20 + ($density - 20) * 0.5);  // 20 → 20, 80 → 50
        $maxDeposit = (int) (50 + ($density - 20) * 0.83); // 20 → 50, 80 → 100

        foreach ($available as $resource) {
            // Rarity-weighted chance: common=60%, uncommon=24%, rare=6%, very_rare=1.2%
            $spawnChance = $resource->rarity()->spawnWeight() * 6;
            if ($rng->chance($spawnChance)) {
                $resources[$resource->value] = $rng->between($minDeposit, $maxDeposit);
            }
        }

        return $resources;
    }
}
