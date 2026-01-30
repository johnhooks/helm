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
 */
final class SystemGenerator
{
    public const ALGORITHM_VERSION = 2;

    /**
     * Resource types that can appear on planets and belts.
     */
    private const RESOURCES = [
        'iron', 'nickel', 'copper', 'titanium',
        'water', 'ice', 'hydrogen', 'helium',
        'rare_earth', 'platinum', 'uranium',
        'crystals', 'organics',
    ];

    /**
     * Station name prefixes.
     */
    private const STATION_PREFIXES = [
        'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
        'Omega', 'Nova', 'Prime', 'Central', 'Outer',
    ];

    /**
     * Station name suffixes.
     */
    private const STATION_SUFFIXES = [
        'Station', 'Outpost', 'Hub', 'Depot', 'Base',
        'Port', 'Dock', 'Platform', 'Complex', 'Terminal',
    ];

    /**
     * Anomaly descriptions by type.
     *
     * @var array<string, array<string>>
     */
    private const ANOMALY_DESCRIPTIONS = [
        'derelict' => [
            'Abandoned cargo vessel drifting in orbit',
            'Derelict mining ship with power signatures',
            'Ancient spacecraft of unknown origin',
        ],
        'signal' => [
            'Repeating signal from unknown source',
            'Encrypted transmission beacon',
            'Distress signal, origin unclear',
        ],
        'artifact' => [
            'Unusual energy readings from debris field',
            'Object exhibiting impossible properties',
            'Fragment of advanced technology',
        ],
        'phenomenon' => [
            'Gravitational anomaly detected',
            'Unusual radiation pattern',
            'Spatial distortion readings',
        ],
        'wreckage' => [
            'Debris field from recent engagement',
            'Scattered wreckage with salvageable parts',
            'Remains of destroyed station',
        ],
    ];

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
        $stations = $this->generateStations($star, $rng, $planets);
        $anomalies = $this->generateAnomalies($star, $rng);

        return new SystemContents(
            starId: $star->id,
            algorithmVersion: self::ALGORITHM_VERSION,
            planets: $planets,
            asteroidBelts: $belts,
            stations: $stations,
            anomalies: $anomalies,
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

        // 60% chance of at least one belt
        if (! $rng->chance(600)) {
            return $belts;
        }

        $beltCount = $rng->between(1, 2);

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

            $belts[] = new AsteroidBelt(
                id: $star->id . '_BELT' . ($i + 1),
                type: $type,
                innerAu: round($innerAu, 2),
                outerAu: round($outerAu, 2),
                density: $rng->between(20, 80),
                resources: $this->generateBeltResources($type, $rng),
            );
        }

        return $belts;
    }

    /**
     * Generate stations.
     *
     * @param array<Planet> $planets
     * @return array<Station>
     */
    private function generateStations(Star $star, SeededRandom $rng, array $planets): array
    {
        $stations = [];

        // Station probability based on star properties
        // Brighter, more hospitable stars have higher chance
        $stationChance = $this->calculateStationChance($star);

        if (! $rng->chance($stationChance)) {
            return $stations;
        }

        $stationCount = $rng->between(1, 3);

        for ($i = 0; $i < $stationCount; $i++) {
            $type = $rng->pick([
                StationType::Trading,
                StationType::Mining,
                StationType::Research,
                StationType::Refueling,
            ]);

            // Determine location
            $orbitsPlanet = null;
            $orbitAu = 0.0;

            if ($planets !== [] && $rng->chance(600)) {
                // 60% chance to orbit a planet
                $planet = $rng->pick($planets);
                $orbitsPlanet = $planet->id;
                $orbitAu = $planet->orbitAu;
            } else {
                // Otherwise orbit the star directly
                $orbitAu = $rng->between(5, 50) / 10; // 0.5 to 5.0 AU
            }

            $stations[] = new Station(
                id: $star->id . '_STN' . ($i + 1),
                name: $this->generateStationName($star, $rng),
                type: $type,
                orbitAu: round($orbitAu, 2),
                orbitsPlanet: $orbitsPlanet,
                services: $this->generateStationServices($type, $rng),
            );
        }

        return $stations;
    }

    /**
     * Generate anomalies.
     *
     * @return array<Anomaly>
     */
    private function generateAnomalies(Star $star, SeededRandom $rng): array
    {
        $anomalies = [];

        // 5% base chance, can have multiple
        if (! $rng->chance(50)) {
            return $anomalies;
        }

        $anomalyCount = $rng->between(1, 2);

        for ($i = 0; $i < $anomalyCount; $i++) {
            $type = $rng->pick([
                AnomalyType::Derelict,
                AnomalyType::Signal,
                AnomalyType::Artifact,
                AnomalyType::Phenomenon,
                AnomalyType::Wreckage,
            ]);

            $descriptions = self::ANOMALY_DESCRIPTIONS[$type->value];

            $reward = $this->generateAnomalyReward($type, $rng);

            $anomalies[] = new Anomaly(
                id: $star->id . '_ANOM' . ($i + 1),
                type: $type,
                description: $rng->pick($descriptions),
                locationAu: $rng->between(1, 100) / 10, // 0.1 to 10.0 AU
                rewardType: $reward['type'],
                rewardValue: $reward['value'],
                difficulty: $rng->between(20, 80),
            );
        }

        return $anomalies;
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
     * @return array<string, int>
     */
    private function generatePlanetResources(PlanetType $type, SeededRandom $rng): array
    {
        $resources = [];
        $resourceCount = $rng->between(1, 4);

        $available = match ($type) {
            PlanetType::Terrestrial, PlanetType::SuperEarth => ['iron', 'copper', 'titanium', 'rare_earth', 'water', 'organics'],
            PlanetType::GasGiant => ['hydrogen', 'helium'],
            PlanetType::HotJupiter => ['hydrogen', 'helium'], // Mostly gas, some exotic chemistry
            PlanetType::IceGiant, PlanetType::Frozen => ['water', 'ice', 'hydrogen', 'helium'],
            PlanetType::MiniNeptune => ['water', 'hydrogen', 'helium', 'ice'],
            PlanetType::Molten => ['iron', 'nickel', 'titanium', 'platinum'],
            PlanetType::Dwarf => ['iron', 'nickel', 'ice'],
        };

        $shuffled = $rng->shuffle($available);

        for ($i = 0; $i < min($resourceCount, count($shuffled)); $i++) {
            $resources[$shuffled[$i]] = $rng->between(10, 100);
        }

        return $resources;
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
     * @return array<string, int>
     */
    private function generateBeltResources(AsteroidBeltType $type, SeededRandom $rng): array
    {
        $resources = [];

        $available = match ($type) {
            AsteroidBeltType::Rocky => ['iron', 'nickel', 'copper'],
            AsteroidBeltType::Metallic => ['iron', 'nickel', 'titanium', 'platinum', 'rare_earth'],
            AsteroidBeltType::Icy => ['water', 'ice', 'hydrogen'],
            AsteroidBeltType::Mixed => ['iron', 'nickel', 'water', 'ice'],
        };

        foreach ($available as $resource) {
            if ($rng->chance(600)) { // 60% chance for each resource
                $resources[$resource] = $rng->between(20, 100);
            }
        }

        return $resources;
    }

    /**
     * Calculate station spawn chance (per mille).
     */
    private function calculateStationChance(Star $star): int
    {
        // Base 30% chance
        $chance = 300;

        // Increase for brighter stars
        $luminosity = $star->properties['luminosity_solar'] ?? 1.0;
        if ($luminosity > 0.5) {
            $chance += 100;
        }

        // Increase for sun-like stars
        if (in_array($star->spectralClass(), ['F', 'G', 'K'], true)) {
            $chance += 100;
        }

        // Decrease for very hot or very dim stars
        if (in_array($star->spectralClass(), ['O', 'B', 'M'], true)) {
            $chance -= 100;
        }

        return max(100, min(700, $chance)); // 10% to 70%
    }

    /**
     * Generate a station name.
     */
    private function generateStationName(Star $star, SeededRandom $rng): string
    {
        $prefix = $rng->pick(self::STATION_PREFIXES);
        $suffix = $rng->pick(self::STATION_SUFFIXES);

        // Sometimes include star name
        if ($star->name !== null && $rng->chance(300)) {
            return $star->name . ' ' . $suffix;
        }

        return $prefix . ' ' . $suffix;
    }

    /**
     * Generate services for a station.
     *
     * @return array<StationService>
     */
    private function generateStationServices(StationType $type, SeededRandom $rng): array
    {
        // Base services by type
        $services = match ($type) {
            StationType::Trading => [StationService::Trade],
            StationType::Mining => [StationService::Trade],
            StationType::Research => [StationService::Missions],
            StationType::Refueling => [StationService::Refuel],
            StationType::Military => [],
        };

        // Add random additional services
        $additional = [
            StationService::Repair,
            StationService::Refuel,
            StationService::Upgrade,
            StationService::Missions,
        ];

        foreach ($additional as $service) {
            if (! in_array($service, $services, true) && $rng->chance(300)) {
                $services[] = $service;
            }
        }

        return $services;
    }

    /**
     * Generate reward for an anomaly.
     *
     * @return array{type: AnomalyReward, value: mixed}
     */
    private function generateAnomalyReward(AnomalyType $type, SeededRandom $rng): array
    {
        return match ($type) {
            AnomalyType::Derelict => [
                'type' => AnomalyReward::Resources,
                'value' => [
                    $rng->pick(self::RESOURCES) => $rng->between(50, 200),
                ],
            ],
            AnomalyType::Signal => [
                'type' => AnomalyReward::Data,
                'value' => $rng->between(100, 500),
            ],
            AnomalyType::Artifact => [
                'type' => AnomalyReward::Artifact,
                'value' => 'artifact_' . $rng->between(1, 100),
            ],
            AnomalyType::Phenomenon => [
                'type' => AnomalyReward::Technology,
                'value' => $rng->between(1, 5),
            ],
            AnomalyType::Wreckage => [
                'type' => AnomalyReward::Credits,
                'value' => $rng->between(1000, 10000),
            ],
        };
    }
}
