# Phase 01: Origin Foundation

Core Origin infrastructure and deterministic world generation.

## Goals

- Establish Origin as the central game server
- Load real star data from Hipparcos catalog
- Implement deterministic system generation
- Track discoveries and known space
- Ship records as data in Origin

## Directory Structure

```
src/Helm/
├── Origin/
│   ├── Provider.php              # Service provider
│   ├── Origin.php                # Core Origin instance
│   └── OriginConfig.php          # Configuration value object
│
├── Stars/
│   ├── Provider.php              # Service provider
│   ├── StarCatalog.php           # Loads/queries real star data
│   ├── Star.php                  # Star value object
│   └── data/
│       └── hipparcos.json        # Star catalog subset
│
├── Generation/
│   ├── Provider.php              # Service provider
│   ├── SystemGenerator.php       # Generates system contents
│   ├── SeededRandom.php          # Deterministic RNG wrapper
│   └── Generated/
│       ├── SystemContents.php    # Generated system container
│       ├── Planet.php            # Planet value object
│       ├── AsteroidBelt.php      # Asteroid belt value object
│       ├── Station.php           # Station value object
│       └── Anomaly.php           # Anomaly value object
│
├── Discovery/
│   ├── Provider.php              # Service provider
│   ├── DiscoveryService.php      # Records and queries discoveries
│   └── Discovery.php             # Discovery record
│
└── Ships/
    ├── Provider.php              # Service provider
    ├── ShipService.php           # Ship CRUD and state management
    └── Ship.php                  # Ship value object
```

## Generation Flow

```
Ship requests scan at star HIP_8102
        │
        ▼
Origin validates request
        │
        ▼
Origin creates work unit
        │
        ├── type: scan
        ├── ship_id: ship-enterprise
        ├── params: { star_id: HIP_8102, depth: 2 }
        ├── duration: 14400 (4 hours)
        │
        ▼
Schedule completion via Action Scheduler
        │
        ▼
        ⋮ (4 hours pass)
        ⋮
        ▼
Action Scheduler fires 'helm_work_complete'
        │
        ▼
SystemGenerator::generate(star, origin_seed)
        │
        ├── 1. Derive seed
        │      seed = hash(master_seed + star_id + algorithm_version)
        │
        ├── 2. Create SeededRandom
        │      rng = new SeededRandom(seed)
        │
        ├── 3. Generate planets
        │      count influenced by star spectral type
        │      types influenced by orbit distance
        │
        ├── 4. Generate resources
        │      types determined by planet type
        │      richness rolled per location
        │
        ├── 5. Generate stations
        │      probability based on star properties
        │      services rolled if present
        │
        ├── 6. Generate anomalies
        │      5% base chance
        │      type and rewards rolled
        │
        ▼
Return SystemContents (deterministic)
        │
        ▼
Hash contents for verification
        │
        ▼
DiscoveryService::record(star, ship, contents)
        │
        ├── First discovery? → Generate bonus
        ├── Increment discovery count
        ├── Check known space threshold
        │
        ▼
Store canonical result
        │
        ▼
Notify ship via webhook
```

## Components

### Origin

The central configuration and identity.

```php
class OriginConfig
{
    public readonly string $id;           // 'origin-alpha'
    public readonly string $masterSeed;   // Random seed set at creation
    public readonly int $knownSpaceThreshold;  // Default: 3
    public readonly int $createdAt;
}
```

### Star Catalog

Real star data from Hipparcos. Start with nearest ~1000 stars.

```php
class Star
{
    public readonly string $id;           // 'HIP_8102'
    public readonly ?string $name;        // 'Tau Ceti' or null
    public readonly string $spectralType; // 'G8V'
    public readonly float $distanceLy;    // 11.912
    public readonly float $ra;            // Right ascension
    public readonly float $dec;           // Declination
    public readonly array $properties;    // mass, radius, temp, etc.
    public readonly array $knownPlanets;  // Real confirmed exoplanets
}

class StarCatalog
{
    public function get(string $id): ?Star;
    public function nearest(int $limit = 100): array;
    public function inRange(float $maxDistanceLy): array;
    public function search(string $query): array;
}
```

### Seeded Random

Deterministic RNG using mt_rand with MT_RAND_MT19937.

```php
class SeededRandom
{
    public function __construct(string $seed);

    public function between(int $min, int $max): int;
    public function chance(int $probabilityPerMille): bool;  // 500 = 50%
    public function pick(array $items): mixed;
    public function shuffle(array $items): array;
}
```

### System Generator

Generates system contents deterministically.

```php
class SystemGenerator
{
    public const ALGORITHM_VERSION = 1;

    public function generate(Star $star, string $masterSeed): SystemContents;
    public function generateSeed(Star $star, string $masterSeed): string;
}

class SystemContents
{
    public readonly array $planets;
    public readonly array $asteroidBelts;
    public readonly array $stations;
    public readonly array $anomalies;
    public readonly ?array $discoveryCache;

    public function hash(): string;
    public function toArray(): array;
}
```

### Discovery Service

Tracks who discovered what and when.

```php
class DiscoveryService
{
    public function record(string $starId, string $shipId, SystemContents $contents): Discovery;
    public function isDiscovered(string $starId): bool;
    public function getDiscoveryCount(string $starId): int;
    public function isKnownSpace(string $starId): bool;
    public function getFirstDiscoverer(string $starId): ?string;
}

class Discovery
{
    public readonly string $starId;
    public readonly string $shipId;
    public readonly int $discoveredAt;
    public readonly bool $isFirst;
    public readonly string $contentsHash;
}
```

### Ships

Ship records stored in Origin.

```php
class Ship
{
    public readonly string $id;           // 'ship-enterprise'
    public readonly string $name;
    public readonly string $location;     // Current star ID
    public readonly int $credits;
    public readonly array $cargo;         // Resource quantities
    public readonly array $artifacts;     // Equipped artifact IDs
    public readonly int $createdAt;
}

class ShipService
{
    public function create(string $name): Ship;
    public function get(string $id): ?Ship;
    public function updateLocation(string $id, string $starId): void;
    public function addCargo(string $id, string $resource, int $quantity): void;
    public function removeCargo(string $id, string $resource, int $quantity): void;
}
```

## Storage

### Custom Tables

```sql
-- Origin configuration
CREATE TABLE {$prefix}helm_origin (
    id VARCHAR(64) PRIMARY KEY,
    master_seed VARCHAR(64) NOT NULL,
    known_space_threshold INT DEFAULT 3,
    created_at INT NOT NULL
);

-- Ships
CREATE TABLE {$prefix}helm_ships (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(64),
    credits BIGINT DEFAULT 10000,
    cargo JSON,
    artifacts JSON,
    created_at INT NOT NULL,
    updated_at INT NOT NULL
);

-- Discoveries
CREATE TABLE {$prefix}helm_discoveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    star_id VARCHAR(64) NOT NULL,
    ship_id VARCHAR(64) NOT NULL,
    contents_hash VARCHAR(64) NOT NULL,
    is_first BOOLEAN DEFAULT FALSE,
    discovered_at INT NOT NULL,
    INDEX idx_star (star_id),
    INDEX idx_ship (ship_id)
);

-- Generated system contents (cached)
CREATE TABLE {$prefix}helm_systems (
    star_id VARCHAR(64) PRIMARY KEY,
    contents JSON NOT NULL,
    contents_hash VARCHAR(64) NOT NULL,
    algorithm_version INT NOT NULL,
    generated_at INT NOT NULL
);
```

## Star Data

### Source

Hipparcos catalog subset. Start with:
- Nearest 1000 stars by distance
- Include all named stars
- Include all stars with known exoplanets

### Format

```json
{
  "HIP_8102": {
    "id": "HIP_8102",
    "name": "Tau Ceti",
    "spectral_type": "G8V",
    "distance_ly": 11.912,
    "ra": 26.017,
    "dec": -15.937,
    "properties": {
      "mass_solar": 0.783,
      "radius_solar": 0.793,
      "temperature_k": 5344,
      "luminosity_solar": 0.52,
      "age_gy": 5.8
    },
    "known_planets": [
      {"name": "Tau Ceti e", "type": "super-earth"},
      {"name": "Tau Ceti f", "type": "super-earth"}
    ]
  }
}
```

### Acquisition

1. Download Hipparcos data from VizieR or similar
2. Filter to nearest stars + named stars
3. Cross-reference with NASA Exoplanet Archive
4. Transform to JSON format
5. Ship with plugin in `src/Helm/Stars/data/`

## Implementation Order

### Step 1: Foundation

1. `SeededRandom` - deterministic RNG
2. `OriginConfig` - configuration value object
3. `Origin` - core instance with seed

### Step 2: Stars

1. `Star` - value object
2. `StarCatalog` - loads JSON, provides queries
3. Acquire and format star data

### Step 3: Generation

1. `Planet`, `AsteroidBelt`, `Station`, `Anomaly` - value objects
2. `SystemContents` - container with hash
3. `SystemGenerator` - core generation logic

### Step 4: Discovery

1. `Discovery` - value object
2. `DiscoveryService` - recording and queries
3. Database table for discoveries

### Step 5: Ships

1. `Ship` - value object
2. `ShipService` - CRUD operations
3. Database table for ships

### Step 6: Integration

1. Wire up service providers
2. REST endpoints for testing
3. CLI commands for testing

## Open Questions

1. **Star data size** - 1000 stars is ~200KB JSON. Acceptable to ship with plugin?

2. **Sol system** - Special case? Everyone starts at Sol, always known?

3. **Real exoplanets** - Include as "already discovered" in generated contents?

4. **Algorithm versioning** - Store version in generated content, never regenerate old versions?

## Success Criteria

- [ ] Can load star catalog and query by ID, distance, name
- [ ] Can generate identical system contents from same seed
- [ ] Can record discoveries and track first discoverer
- [ ] Can create ships and track location/cargo
- [ ] Generation matches documented behavior in generation.md
