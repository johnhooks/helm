# World Generation

How the universe is generated, verified, and discovered.

## Foundation: Real Stars

The universe is built on real astronomical data. Stars are not generated - they're imported from actual star catalogs. What we generate is what's IN and BETWEEN those stars.

```
REAL DATA (from catalogs):
├── Star positions (3D coordinates)
├── Star names (proper names, catalog IDs)
├── Spectral classifications (O, B, A, F, G, K, M)
├── Physical properties (mass, temperature, luminosity)
└── Known exoplanets (from confirmed discoveries)

GENERATED (seeded, deterministic):
├── Undiscovered planets and moons
├── Asteroid belts
├── Resource types
├── Stations and settlements
├── Anomalies and derelicts
└── Interstellar objects
```

## Star Catalogs

### Starting Dataset

```
Hipparcos Catalog
- ~100,000 stars
- Well-documented properties
- Includes nearest/brightest stars
- Manageable size for initial implementation

Later expansion:
- Gaia DR3 (~1.8 billion stars)
- SIMBAD cross-references
- NASA Exoplanet Archive
```

### Star Record Structure

```php
[
    'id' => 'HIP_8102',              // Catalog ID
    'name' => 'Tau Ceti',            // Common name (if any)
    'constellation' => 'Cetus',
    'spectral_type' => 'G8V',
    'coordinates' => [
        'ra' => 26.017,              // Right ascension
        'dec' => -15.937,            // Declination
        'distance_ly' => 11.912,     // Light years from Sol
    ],
    'properties' => [
        'mass_solar' => 0.783,       // Solar masses
        'radius_solar' => 0.793,     // Solar radii
        'temperature_k' => 5344,     // Surface temperature
        'luminosity_solar' => 0.52,  // Solar luminosities
        'age_gy' => 5.8,             // Billion years
    ],
    'known_planets' => [             // Real confirmed planets
        ['name' => 'Tau Ceti e', 'type' => 'super-earth'],
        ['name' => 'Tau Ceti f', 'type' => 'super-earth'],
    ],
]
```

## The Seed System

### Deterministic Generation

Every piece of generated content derives from a seed. Same seed always produces same result.

```php
class SystemGenerator
{
    public function generateSeed(string $starId): string
    {
        return hash('sha256', implode(':', [
            $this->origin->masterSeed,  // Origin's unique seed
            $starId,                     // Star's catalog ID
            self::ALGORITHM_VERSION,     // For versioning
        ]));
    }

    public function generate(Star $star): SystemContents
    {
        $seed = $this->generateSeed($star->id);
        $rng = new SeededRandom($seed);

        return new SystemContents(
            planets: $this->generatePlanets($rng, $star),
            asteroids: $this->generateAsteroids($rng, $star),
            stations: $this->generateStations($rng, $star),
            anomalies: $this->generateAnomalies($rng, $star),
        );
    }
}
```

### Why This Works

```
Tau Ceti + Origin A seed → specific planets, resources, stations
Tau Ceti + Origin B seed → DIFFERENT planets, resources, stations

Same star, different origins = different universes.
But within an origin, always consistent.
```

## Generation Layers

### Layer 1: System Structure

```php
function generatePlanets(SeededRandom $rng, Star $star): array
{
    // Star type influences planet count and types
    $planetCount = $this->rollPlanetCount($rng, $star->spectralType);

    $planets = [];
    for ($i = 0; $i < $planetCount; $i++) {
        $orbit = $this->calculateOrbit($rng, $star, $i);
        $type = $this->rollPlanetType($rng, $star, $orbit);

        $planets[] = new Planet(
            orbit: $orbit,
            type: $type,
            moons: $this->generateMoons($rng, $type),
            resources: $this->rollResources($rng, $type),
        );
    }

    return $planets;
}
```

### Layer 2: Resources

Resources are TYPE only, not quantity. A location either has a resource type or it doesn't.

```php
function rollResources(SeededRandom $rng, string $planetType): array
{
    $available = self::RESOURCE_TABLE[$planetType];
    $resources = [];

    foreach ($available as $resource => $probability) {
        if ($rng->chance($probability)) {
            $resources[] = $resource;
        }
    }

    return $resources;
}
```

Resource presence by planet type:

| Planet Type | Common Resources | Uncommon | Rare |
|-------------|------------------|----------|------|
| terrestrial | iron, silicon, nickel | copper, aluminum | rare earths |
| superEarth | iron, silicon, titanium | rare earths, platinum | exotic metals |
| desert | iron, silicon, copper | aluminum, lithium | rare earths |
| ocean | water, salt, organics | deuterium, minerals | aquatic life |
| toxic | sulfur, carbon, nitrogen | exotic gases, acids | strange matter |
| molten | iron, nickel, magma metals | titanium, chromium | neutronium traces |
| gasGiant | hydrogen, helium | deuterium, ammonia | exotic gases |
| iceGiant | water, ammonia, methane | nitrogen, deuterium | helium-3 |
| hotJupiter | hydrogen, exotic gases | plasma metals | strange matter |
| frozen | water, ammonia, methane | nitrogen, CO2 | ancient organics |
| dwarf | iron, nickel, ice | platinum, cobalt | artifacts |
| asteroid | iron, nickel, cobalt | platinum, gold | artifacts |

### Layer 3: Stations and Settlements

```php
function generateStations(SeededRandom $rng, Star $star): array
{
    // Station probability based on star properties
    $probability = $this->calculateStationProbability($star);

    if (!$rng->chance($probability)) {
        return [];
    }

    return [
        new Station(
            type: $this->rollStationType($rng),
            services: $this->rollServices($rng),
            faction: $this->rollFaction($rng),
        ),
    ];
}
```

Station types:
- Trading post (common)
- Mining operation (in resource-rich systems)
- Research station (near anomalies)
- Naval base (strategic locations)
- Abandoned facility (salvage opportunity)

### Layer 4: Anomalies

Rare discoveries that add variety:

```php
function generateAnomalies(SeededRandom $rng, Star $star): array
{
    if (!$rng->chance(0.05)) {  // 5% of systems
        return [];
    }

    return [
        new Anomaly(
            type: $rng->pick([
                'derelict_ship',
                'ancient_ruins',
                'spatial_rift',
                'signal_source',
                'debris_field',
            ]),
            danger: $rng->between(1, 10),
            reward: $this->generateAnomalyReward($rng),
        ),
    ];
}
```

## Star Type Influences

The star's real properties shape what gets generated. See `astronomy.md` for detailed descriptions of each type.

### Planet Count by Spectral Class

```php
const PLANET_COUNT_RANGE = [
    'O' => [0, 2],    // Very few, most destroyed
    'B' => [0, 3],    // Few, young systems
    'A' => [1, 5],    // Moderate
    'F' => [2, 8],    // Good variety
    'G' => [3, 10],   // Rich systems (Sol-like)
    'K' => [2, 8],    // Common, stable
    'M' => [1, 6],    // Close-in systems
];
```

### Planet Type Probability by Spectral Class

Percentages indicate chance when rolling a planet at that orbital position.

**Inner System (< frost line):**

| Type | O | B | A | F | G | K | M |
|------|---|---|---|---|---|---|---|
| molten | 60 | 40 | 20 | 10 | 5 | 5 | 10 |
| terrestrial | 10 | 20 | 30 | 35 | 40 | 35 | 30 |
| desert | 15 | 20 | 25 | 25 | 20 | 25 | 25 |
| toxic | 10 | 15 | 15 | 15 | 15 | 15 | 15 |
| ocean | 0 | 0 | 5 | 10 | 15 | 15 | 10 |
| superEarth | 5 | 5 | 5 | 5 | 5 | 5 | 10 |

**Outer System (> frost line):**

| Type | O | B | A | F | G | K | M |
|------|---|---|---|---|---|---|---|
| gasGiant | 20 | 25 | 30 | 35 | 35 | 30 | 25 |
| iceGiant | 15 | 20 | 25 | 25 | 25 | 30 | 30 |
| hotJupiter | 30 | 20 | 10 | 5 | 5 | 5 | 10 |
| frozen | 20 | 25 | 25 | 25 | 25 | 25 | 25 |
| dwarf | 15 | 10 | 10 | 10 | 10 | 10 | 10 |

**Ringed modifier:** Any gas giant, ice giant, or frozen planet has 20% chance of rings.

### Planet Type Definitions

```php
const PLANET_TYPES = [
    // Rocky inner worlds
    'terrestrial',  // Earth-like rocky, potential habitability
    'superEarth',   // Large rocky, high gravity
    'desert',       // Arid, mineral-rich
    'ocean',        // Water-covered
    'toxic',        // Venus-like, hostile atmosphere
    'molten',       // Lava world, extreme heat

    // Outer system
    'gasGiant',     // Jupiter-like, hydrogen/helium
    'iceGiant',     // Neptune-like, volatile ices
    'hotJupiter',   // Gas giant in close orbit
    'frozen',       // Ice world
    'dwarf',        // Small body
    'ringed',       // Modifier: has ring system
];
```

### Stellar Type Generation

Most stars from catalogs are main sequence. Exotic objects are determined by catalog data or generated for fictional systems.

```php
const STELLAR_TYPES = [
    'mainSequence',  // Normal star (default)
    'giant',         // Expanded, late-life
    'whiteDwarf',    // Dead star remnant
    'neutron',       // Collapsed massive star
    'pulsar',        // Rotating neutron star
    'brownDwarf',    // Failed star
];
```

**Stellar type affects planet generation:**

| Stellar Type | Planet Generation |
|--------------|-------------------|
| mainSequence | Normal rules |
| giant | Fewer planets, expanded orbits, some destroyed |
| whiteDwarf | Only distant remnant planets, ancient |
| neutron | No planets, debris only |
| pulsar | No planets, radiation hazard |
| brownDwarf | Few small planets, very cold |

### Binary System Generation

Binary stars are flagged in catalog data or generated with probability based on spectral class.

```php
const BINARY_PROBABILITY = [
    'O' => 0.70,  // Most O stars are binary
    'B' => 0.60,
    'A' => 0.50,
    'F' => 0.45,
    'G' => 0.45,
    'K' => 0.35,
    'M' => 0.25,
];
```

**Binary system structure:**

```php
function generateBinarySystem(Star $primary, SeededRandom $rng): BinarySystem
{
    // Secondary star is usually cooler
    $secondaryClass = $this->rollSecondaryClass($rng, $primary->spectralClass);

    // Determine separation
    $separation = $rng->pick(['close', 'medium', 'wide']);

    return new BinarySystem(
        primary: $primary,
        secondary: new Star(spectralClass: $secondaryClass),
        separation: $separation,
        // Close binaries: only circumbinary (P-type) planets
        // Wide binaries: each star can have S-type planets
        planets: $this->generateBinaryPlanets($rng, $separation),
    );
}
```

### Hazard Ratings

Systems have a hazard rating affecting ship damage and operation difficulty.

```php
function calculateHazardRating(Star $star): int
{
    $base = match($star->spectralClass) {
        'O' => 8,
        'B' => 6,
        'A' => 3,
        'F' => 1,
        'G' => 1,
        'K' => 1,
        'M' => 2,  // Flare stars
    };

    $modifier = match($star->stellarType) {
        'mainSequence' => 0,
        'giant' => +2,
        'whiteDwarf' => +1,
        'neutron' => +8,
        'pulsar' => +10,
        'brownDwarf' => -1,
    };

    return clamp($base + $modifier, 1, 10);
}
```

## Interstellar Space

The void between stars isn't empty.

### Interstellar Generation

```php
function generateInterstellar(Star $from, Star $to): InterstellarContents
{
    // Seed from both stars ensures consistency
    $seed = hash('sha256', implode(':', [
        $this->origin->masterSeed,
        min($from->id, $to->id),  // Consistent ordering
        max($from->id, $to->id),
    ]));

    $rng = new SeededRandom($seed);

    return new InterstellarContents(
        roguePlanets: $this->maybeRoguePlanet($rng),
        comets: $this->maybeComets($rng),
        derelicts: $this->maybeDerelict($rng),
        anomalies: $this->maybeAnomaly($rng),
    );
}
```

### What's Out There

```
Rogue planets (rare):
- Ejected from systems
- Cold, dark
- Potentially valuable resources

Comets (uncommon):
- Ice and volatiles
- Easy mining

Derelicts (rare):
- Ships that didn't make it
- Salvage opportunity
- Story fragments

Deep space stations (very rare):
- Waypoints on long routes
- Trading opportunities
- Who built them?
```

## First Discovery Bonus

When you're the first to explore a system, you get rewards.

### Discovery Cache

```php
function generateDiscoveryCache(SeededRandom $rng, Star $star): DiscoveryCache
{
    // One-time reward for first explorer
    return new DiscoveryCache(
        credits: $rng->between(1000, 10000),
        reputation: $rng->between(10, 50),
        items: $this->rollDiscoveryItems($rng),
        claimed: false,
    );
}
```

### Discovery Items

```
Common:
- Navigation data (reveals nearby stars)
- Resource surveys (shows system resources)
- Credits

Uncommon:
- Rare materials
- Equipment upgrades
- Station coordinates

Rare:
- Ancient artifacts
- Unique ship components
- Mysterious data
```

### First Explorer Rights

```
When you first explore a system:

1. Your name attached permanently
   "Tau Ceti - First explored by ENTERPRISE"

2. Discovery cache yours to claim
   One-time rewards

3. Information advantage
   You know what's here before others

4. Naming rights (maybe?)
   Name the planets you discover
```

## Known Space Threshold

Systems become "known" (public) when multiple ships discover them.

### The Count

```
Discovery count = 1 → Private (only discoverer knows)
Discovery count = 2 → Still private
Discovery count = 3 → Becomes KNOWN SPACE

Threshold is configurable per Origin.
```

### Tracking Discoveries

```php
// Origin tracks discovery counts
[
    'HIP_8102' => [  // Tau Ceti
        'hash' => 'sha256:...',
        'content' => {...},
        'discovered_by' => [
            'ship-enterprise' => ['at' => 1706472000, 'first' => true],
            'ship-reliant' => ['at' => 1706500000],
            'ship-voyager' => ['at' => 1706510000],
        ],
        'discovery_count' => 3,
        'status' => 'known',
        'became_known_at' => 1706510000,
    ],
]
```

### Known Space Growth

```
Initial state:
- Sol system is known (everyone starts here)
- Nearby stars unknown (frontier)

As players explore:
- Popular routes become known
- Strategic systems become known
- Remote systems stay private longer

Organic growth from Sol outward.
```

## Resources

Locations have resource TYPES (what can be mined). Mining yields QUANTITIES.

### Resource Categories

```
COMMON
├── Iron - structural material
├── Silicon - electronics base
├── Water - life support, fuel
├── Carbon - organics, materials
└── Nickel - alloys

UNCOMMON
├── Copper - electronics
├── Aluminum - lightweight structures
├── Titanium - high-strength alloys
├── Platinum - catalysts
└── Helium-3 - fusion fuel

RARE
├── Rare earths - advanced electronics
├── Exotic matter - experimental tech
├── Ancient materials - alien origin
└── Data crystals - information storage
```

### Types and Quantities

```
Generation determines:
├── What resource TYPES exist at a location
├── Location "richness" (affects yield rates)
└── Both are deterministic from seed

Mining produces:
├── Actual QUANTITIES of resources
├── Based on: duration × richness × equipment
├── Goes into cargo hold (limited capacity)

Example:
├── Location has: [iron, platinum]
├── Mine iron for 6 hours
├── Yield: 60 iron ore (quantity)
├── Cargo: 0/100 → 60/100
```

### Scarcity Model

```
Resources are NOT infinite quantities.
Mining takes time → limited extraction rate.
Cargo is limited → can't carry infinite amounts.
Rare types in few places → location scarcity.

Scarcity emerges from:
├── Location (rare resources in few places)
├── Time (mining takes hours)
├── Distance (good stuff far from stations)
├── Cargo capacity (can't carry infinite amounts)
```

## Algorithm Versioning

As we add features, the algorithm changes. Old content stays valid.

### Version Tracking

```php
class SystemGenerator
{
    const ALGORITHM_VERSION = 1;

    // Version history:
    // v1: Initial release - basic planets, resources
    // v2: (future) Added moons, asteroid details
    // v3: (future) Added anomaly subtypes
}
```

### Verification Uses Version

```
Discovery submitted:
{
    "star_id": "HIP_8102",
    "algorithm_version": 1,
    "content_hash": "sha256:...",
    "content": {...}
}

Verification runs same version:
- Verifier uses v1 algorithm
- Produces same hash
- Verified ✓

Old discoveries never re-verified with new algorithm.
```

### Content is Permanent

```
Once verified and stored:
- Content is canonical
- Hash is truth
- Algorithm version recorded
- Never regenerated

New algorithm versions only affect new discoveries.
```

## Implementation Phases

### Phase 1: Foundation

```
- Import Hipparcos subset (nearest 1000 stars)
- Basic planet generation (type, orbit)
- Simple resources (5 types)
- First discovery bonus (credits only)
- Known space threshold = 3
```

### Phase 2: Depth

```
- Full Hipparcos catalog
- Moons and rings
- More resource types (15+)
- Station generation
- Interstellar content
```

### Phase 3: Polish

```
- Anomaly system
- Faction presence
- Dynamic events (maybe?)
- Expanded discovery rewards
- Naming system
```

## Example: Generating Tau Ceti

```php
$star = $catalog->get('HIP_8102');  // Tau Ceti

$generator = new SystemGenerator($origin);
$contents = $generator->generate($star);

// Result (deterministic for this origin):
{
    "star": {
        "id": "HIP_8102",
        "name": "Tau Ceti",
        "spectralClass": "G",
        "stellarType": "mainSequence",
        "hazardRating": 1
    },
    "planets": [
        {
            "name": "Tau Ceti I",
            "type": "desert",
            "orbit_au": 0.4,
            "resources": ["iron", "silicon", "copper"]
        },
        {
            "name": "Tau Ceti II",
            "type": "terrestrial",
            "orbit_au": 0.7,
            "habitable": true,
            "resources": ["iron", "water", "organics"]
        },
        {
            "name": "Tau Ceti III",
            "type": "ocean",
            "orbit_au": 1.1,
            "habitable": true,
            "resources": ["water", "salt", "deuterium"]
        },
        {
            "name": "Tau Ceti IV",
            "type": "superEarth",
            "orbit_au": 1.8,
            "resources": ["iron", "titanium", "rare_earths"]
        },
        {
            "name": "Tau Ceti V",
            "type": "gasGiant",
            "orbit_au": 5.2,
            "ringed": true,
            "resources": ["hydrogen", "helium", "deuterium"],
            "moons": 4
        },
        {
            "name": "Tau Ceti VI",
            "type": "iceGiant",
            "orbit_au": 12.0,
            "resources": ["water", "ammonia", "methane"]
        },
        {
            "name": "Tau Ceti VII",
            "type": "frozen",
            "orbit_au": 25.0,
            "resources": ["water", "nitrogen"]
        }
    ],
    "asteroidBelts": [
        {
            "orbit_au": 2.8,
            "resources": ["nickel", "platinum", "cobalt"]
        }
    ],
    "stations": [
        {
            "name": "Tau Ceti Station",
            "type": "trading_post",
            "services": ["trade", "refuel", "repair"]
        }
    ],
    "anomalies": [],
    "discoveryCache": {
        "credits": 5000,
        "items": ["navigation_data_epsilon_eridani"],
        "reputation": 25
    }
}

$hash = hash('sha256', json_encode($contents));
// This hash is now canonical for Tau Ceti in this origin
```

## Example: Binary System (Alpha Centauri)

```php
{
    "system": {
        "id": "HIP_71683",
        "name": "Alpha Centauri",
        "type": "binary",
        "separation": "wide"
    },
    "stars": [
        {
            "id": "HIP_71683_A",
            "name": "Alpha Centauri A",
            "spectralClass": "G",
            "stellarType": "mainSequence"
        },
        {
            "id": "HIP_71681_B",
            "name": "Alpha Centauri B",
            "spectralClass": "K",
            "stellarType": "mainSequence"
        }
    ],
    "planets": [
        {
            "name": "Alpha Centauri A I",
            "orbits": "HIP_71683_A",
            "orbitType": "S-type",
            "type": "terrestrial",
            "orbit_au": 0.9
        },
        {
            "name": "Alpha Centauri B I",
            "orbits": "HIP_71681_B",
            "orbitType": "S-type",
            "type": "desert",
            "orbit_au": 0.5
        }
    ]
}
```

## Example: Exotic System (Pulsar)

```php
{
    "star": {
        "id": "PSR_J0737",
        "name": "PSR J0737-3039",
        "spectralClass": null,
        "stellarType": "pulsar",
        "hazardRating": 10
    },
    "planets": [],
    "debrisFields": [
        {
            "type": "supernova_remnant",
            "resources": ["neutronium", "exotic_matter"]
        }
    ],
    "anomalies": [
        {
            "type": "radiation_zone",
            "danger": 10,
            "scanReward": "pulsar_timing_data"
        }
    ]
}
```

## Summary

Generation in Helm:

1. **Real stars** as the foundation (from astronomical catalogs)
2. **Seeded generation** for system contents (deterministic, verifiable)
3. **Star properties** influence what gets generated
4. **Resources are types**, not quantities (infinite extraction)
5. **First discovery** rewards exploration
6. **Known space** emerges from collective discovery
7. **Algorithm versioning** allows evolution without breaking history

The result: a universe grounded in reality, with infinite variety to discover, where exploration is meaningful and every discovery is permanent.
