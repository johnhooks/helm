# Economy: Artifacts

Ship upgrades that provide bonuses. Origin tracks them, Origin calculates effects.

## Overview

Artifacts are special items that enhance ship capabilities. Unlike resources, they're not consumed - they're equipped and provide ongoing bonuses.

```
Discover artifact in ancient ruins
    ↓
Origin verifies and records ownership
    ↓
Ship equips artifact (stored in ship state)
    ↓
Origin calculates bonuses on work units
    ↓
Ship performs better
```

## Artifact Structure

### Origin's Record

```php
[
    'id' => 'artifact-nav-array-7x9k2',
    'hash' => 'sha256:a1b2c3d4e5f6...',
    'type' => 'navigation_array',
    'name' => 'Ancient Navigation Array',
    'description' => 'Salvaged from a derelict in the Tau Ceti debris field.',
    'effects' => [
        'scan_range' => 1200,      // 1.2x multiplier (scaled integer)
    ],
    'rarity' => 'uncommon',
    'bound_to' => 'ship-enterprise',
    'equipped' => true,
    'origin' => 'origin-alpha',
    'discovered_by' => 'ship-enterprise',
    'discovered_at' => 1706472000,
    'discovery_location' => 'HIP_8102:debris_field_1',
    'transfer_history' => [],
]
```

### Ship's Local Cache

Ships cache their artifacts locally for display, but Origin is authoritative:

```php
// Stored in wp_options or custom table
[
    'artifacts' => [
        [
            'id' => 'artifact-nav-array-7x9k2',
            'type' => 'navigation_array',
            'name' => 'Ancient Navigation Array',
            'equipped' => true,
            'effects' => ['scan_range' => 1200],
        ],
    ],
    'synced_at' => 1706558400,
]
```

## Effect Calculation

### Ship Doesn't Calculate

The ship never applies its own bonuses. That would be trivially cheatable.

```php
// WRONG - ship calculates own bonus
$scanRange = $baseRange * $this->getArtifactBonus('scan_range');

// RIGHT - ship reports equipment, Origin calculates
$workUnit = [
    'type' => 'scan',
    'params' => [...],
    'equipped_artifacts' => ['artifact-nav-array-7x9k2'],
];
$this->origin->submit($workUnit);
```

### Origin Calculates

```php
class OriginWorkProcessor
{
    public function process(array $workUnit): WorkResult
    {
        $ship = $this->ships->find($workUnit['ship_id']);

        // Get equipped artifacts from Origin's records (not ship's claim)
        $artifacts = $this->artifacts
            ->where('bound_to', $ship->id)
            ->where('equipped', true)
            ->get();

        // Calculate effective stats
        $stats = $this->calculateStats($ship, $artifacts);

        // Process work with modified stats
        return match($workUnit['type']) {
            'scan' => $this->processScan($workUnit, $stats),
            'mine' => $this->processMine($workUnit, $stats),
            'travel' => $this->processTravel($workUnit, $stats),
        };
    }

    private function calculateStats(Ship $ship, array $artifacts): ShipStats
    {
        $stats = $ship->baseStats();

        foreach ($artifacts as $artifact) {
            foreach ($artifact['effects'] as $stat => $modifier) {
                $stats->modify($stat, $modifier);
            }
        }

        return $stats;
    }
}
```

### Effect Types

All modifiers use scaled integers (1000 = 1.0x):

```php
// Multiplicative effects (base 1000)
'scan_range' => 1200        // 1.2x (20% increase)
'travel_speed' => 1150      // 1.15x (15% faster)
'fuel_efficiency' => 900    // 0.9x (10% less fuel used)
'mining_yield' => 1300      // 1.3x (30% more resources)

// Additive effects (raw integers)
'cargo_capacity' => 25      // +25 cargo slots
'scan_depth' => 1           // +1 scan depth

// Unlocks (boolean as 1/0)
'can_mine_gas_giants' => 1
'can_detect_anomalies' => 1
'can_salvage_derelicts' => 1
```

## Artifact Types

### Navigation

```
Navigation Array     - Scan range +20%
Star Charts         - Reveals nearby known space
Jump Calculator     - Travel time -15%
Anomaly Detector    - Can detect anomalies during scan
```

### Engineering

```
Fuel Processor      - Fuel efficiency +15%
Cargo Expander      - Cargo capacity +25
Hull Reinforcement  - Damage resistance (future)
Engine Upgrade      - Travel speed +10%
```

### Mining

```
Mining Laser        - Mining yield +20%
Ore Scanner         - Shows resource quality
Gas Collector       - Can mine gas giants
Refinery Module     - Process ore during travel
```

### Special

```
Ancient AI Core     - Multiple small bonuses
Alien Beacon        - Reveals hidden locations
Origin Key          - Access to restricted space
Data Archive        - Contains lore/history
```

## Discovery

### Where Artifacts Come From

```
Anomalies (most common source):
├── Derelict ships → Engineering artifacts
├── Ancient ruins → Navigation artifacts
├── Debris fields → Mining artifacts
└── Signal sources → Special artifacts

First discovery bonus:
├── Sometimes includes artifact
└── Rarity based on location

Station shops (rare):
├── Common artifacts for sale
└── Expensive
```

### Generation

Artifacts are generated deterministically like everything else:

```php
function generateAnomaly(SeededRandom $rng, Star $star): ?Anomaly
{
    if (!$rng->chance(50)) {  // 5% chance (50/1000)
        return null;
    }

    $type = $rng->pick(['derelict', 'ruins', 'debris', 'signal']);

    $anomaly = new Anomaly(
        type: $type,
        artifact: $this->maybeGenerateArtifact($rng, $type),
    );

    return $anomaly;
}

function maybeGenerateArtifact(SeededRandom $rng, string $anomalyType): ?array
{
    $chance = match($anomalyType) {
        'derelict' => 400,   // 40% chance
        'ruins' => 600,      // 60% chance
        'debris' => 200,     // 20% chance
        'signal' => 800,     // 80% chance
    };

    if (!$rng->chance($chance)) {
        return null;
    }

    return [
        'type' => $this->pickArtifactType($rng, $anomalyType),
        'effects' => $this->rollEffects($rng),
        'rarity' => $this->rollRarity($rng),
    ];
}
```

### Claiming an Artifact

```
Ship explores anomaly (work unit)
    ↓
Work completes, artifact discovered
    ↓
Ship submits to Origin:
{
    "work_type": "explore_anomaly",
    "location": "HIP_8102:anomaly_1",
    "result_hash": "sha256:..."
}
    ↓
Origin verifies (re-generates, checks hash)
    ↓
Origin records: artifact bound to ship
    ↓
Origin responds with artifact data
    ↓
Ship caches artifact locally
```

## Equipping

### Equip/Unequip

Ships manage their loadout through Origin:

```
POST /helm/artifacts/equip
{
    "artifact_id": "artifact-nav-array-7x9k2"
}

Response:
{
    "status": "equipped",
    "artifact": {...}
}
```

```
POST /helm/artifacts/unequip
{
    "artifact_id": "artifact-nav-array-7x9k2"
}

Response:
{
    "status": "unequipped"
}
```

### Equipment Slots (Optional)

Could limit how many artifacts can be equipped:

```
Ship has 3 artifact slots (base)
├── Slot 1: Navigation Array (equipped)
├── Slot 2: Mining Laser (equipped)
├── Slot 3: empty
└── Inventory: Fuel Processor, Cargo Expander (not equipped)

Artifacts in inventory don't provide bonuses.
Must equip to gain effects.
Slots can be expanded via ship upgrades.
```

Or keep it simple: equip anything, no limits. Balance through rarity.

## Trading Artifacts

### Transfer Flow

```
Ship A wants to sell artifact to Ship B
    ↓
Ship A must unequip artifact first
    ↓
Ship A initiates transfer:
POST /helm/artifacts/transfer
{
    "artifact_id": "artifact-nav-array-7x9k2",
    "to_ship": "ship-reliant",
    "price": 5000
}
    ↓
Origin validates:
├── Ship A owns artifact?
├── Artifact is unequipped?
├── Ship B exists and is trusted?
    ↓
Origin creates pending transfer
    ↓
Ship B accepts:
POST /helm/artifacts/transfer/accept
{
    "transfer_id": "transfer-12345"
}
    ↓
Origin executes atomically:
├── artifact.bound_to = "ship-reliant"
├── Ship A credits += 5000
├── Ship B credits -= 5000
├── Record transfer in history
    ↓
Both ships notified
```

### Transfer Restrictions

```
Cannot transfer if:
├── Artifact is currently equipped
├── Ship has active work unit in progress
├── Artifact is "soulbound" (some can't be traded)

Transfer history is permanent:
├── Origin tracks all previous owners
├── Provenance is verifiable
```

## Artifact Rarity

### Tiers

```
COMMON (60%)
├── Small bonuses (+5-10%)
├── Single effect
└── Easily found

UNCOMMON (25%)
├── Medium bonuses (+10-20%)
├── May have 2 effects
└── Anomaly rewards

RARE (10%)
├── Large bonuses (+20-35%)
├── Multiple effects
└── Deep space only

LEGENDARY (4%)
├── Unique effects
├── Unlocks abilities
└── Named artifacts with lore

ANCIENT (1%)
├── Extremely powerful
├── Multiple strong effects
└── Very rare locations only
```

### Rarity Effects

```php
function rollEffects(SeededRandom $rng, string $rarity): array
{
    $effectCount = match($rarity) {
        'common' => 1,
        'uncommon' => $rng->between(1, 2),
        'rare' => $rng->between(2, 3),
        'legendary' => $rng->between(3, 4),
        'ancient' => $rng->between(4, 5),
    };

    // Magnitude ranges (scaled, 1000 = 1.0x)
    $magnitudeRange = match($rarity) {
        'common' => [1050, 1100],      // 5-10%
        'uncommon' => [1100, 1200],    // 10-20%
        'rare' => [1200, 1350],        // 20-35%
        'legendary' => [1350, 1500],   // 35-50%
        'ancient' => [1500, 2000],     // 50-100%
    };

    $effects = [];
    for ($i = 0; $i < $effectCount; $i++) {
        $stat = $rng->pick($this->getAvailableStats());
        $magnitude = $rng->between($magnitudeRange[0], $magnitudeRange[1]);
        $effects[$stat] = $magnitude;
    }

    return $effects;
}
```

## API Endpoints

```
GET  /helm/artifacts              - List ship's artifacts
GET  /helm/artifacts/{id}         - Get artifact details
POST /helm/artifacts/equip        - Equip an artifact
POST /helm/artifacts/unequip      - Unequip an artifact
POST /helm/artifacts/transfer     - Initiate transfer to another ship
POST /helm/artifacts/transfer/accept  - Accept incoming transfer
POST /helm/artifacts/transfer/cancel  - Cancel pending transfer
```

## Summary

Artifacts in Helm:

1. **Are data records** - Stored by Origin, cached by ship
2. **Origin-verified** - Effects calculated by Origin, not ship
3. **Equippable** - Must equip to gain bonuses
4. **Tradeable** - Transfer between ships via Origin
5. **Deterministically generated** - Same seed = same artifact
6. **Have provenance** - Full ownership history tracked

The player experience:

```
Explore anomaly → Find artifact →
Artifact appears in inventory →
Equip to gain bonuses →
Ship performs better →
Maybe trade it later for credits
```

Simple data, complex effects, all verified by Origin.
