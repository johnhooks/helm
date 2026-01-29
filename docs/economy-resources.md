# Economy: Resources & Manufacturing

Spreadsheets in space, but open source and on WordPress.

## Overview

```
RAW RESOURCES
    │ (mining)
    ▼
REFINED MATERIALS
    │ (processing)
    ▼
COMPONENTS
    │ (manufacturing)
    ▼
PRODUCTS
    │
    ├── Ship modules
    ├── Station parts
    ├── Consumables
    └── Trade goods
```

A complete production chain. Mine rocks, build spaceships.

## Raw Resources

### Resource Categories

```
ORE (mined from asteroids, planets)
├── Iron Ore         - Common, structural base
├── Nickel Ore       - Common, alloy component
├── Copper Ore       - Uncommon, electronics
├── Titanium Ore     - Uncommon, high-strength
├── Platinum Ore     - Rare, catalysts
├── Gold Ore         - Rare, electronics
├── Rare Earth Ore   - Rare, advanced tech
└── Exotic Ore       - Very rare, special properties

GAS (collected from gas giants, nebulae)
├── Hydrogen         - Common, fuel base
├── Helium           - Common, coolant
├── Nitrogen         - Uncommon, life support
├── Deuterium        - Rare, fusion fuel
├── Helium-3         - Very rare, advanced fuel
└── Exotic Gas       - Very rare, special

ICE (harvested from ice bodies, comets)
├── Water Ice        - Common, life support
├── Ammonia Ice      - Uncommon, chemicals
├── Methane Ice      - Uncommon, fuel
└── Nitrogen Ice     - Rare, cryogenics

ORGANIC (found on habitable worlds)
├── Biomass          - Common, food/materials
├── Proteins         - Uncommon, medicine
├── Rare Compounds   - Rare, pharmaceuticals
└── Alien Tissue     - Very rare, research
```

### Resource Properties

```php
[
    'id' => 'iron_ore',
    'name' => 'Iron Ore',
    'category' => 'ore',
    'volume' => 0.1,           // m³ per unit
    'base_value' => 5,         // credits per unit
    'rarity' => 'common',
    'refines_to' => 'iron',
    'refine_ratio' => 0.5,     // 100 ore → 50 iron
    'found_at' => ['asteroid', 'rocky_planet'],
]
```

## Mining

### Mining Work Unit

```php
[
    'type' => 'mine',
    'params' => [
        'location' => 'HIP_8102:asteroid_belt_1',
        'resource' => 'iron_ore',
        'duration' => 21600,    // 6 hours
    ],
    'yields' => [
        'resource' => 'iron_ore',
        'base_quantity' => 100,
        // Modified by artifacts, ship equipment
    ],
]
```

### Yield Calculation

```php
class MiningCalculator
{
    public function calculate(MineWorkUnit $unit, ShipStats $stats): int
    {
        $base = $this->getBaseYield($unit->resource, $unit->duration);

        // Artifact bonuses
        $multiplier = $stats->get('mining_yield', 1.0);

        // Location richness (generated property)
        $richness = $this->getLocationRichness($unit->location);

        // Final yield
        return (int) floor($base * $multiplier * $richness);
    }

    private function getBaseYield(string $resource, int $duration): int
    {
        // Base: 10 units per hour for common
        $perHour = match($this->getRarity($resource)) {
            'common' => 10,
            'uncommon' => 6,
            'rare' => 3,
            'very_rare' => 1,
        };

        return $perHour * ($duration / 3600);
    }
}
```

### Mining Locations

Not all locations have all resources:

```
Star System Contents (generated):
├── Asteroid Belt 1: [iron_ore, nickel_ore]
├── Asteroid Belt 2: [copper_ore, titanium_ore]
├── Planet II (rocky): [iron_ore, rare_earth_ore]
├── Planet III (gas giant): [hydrogen, helium, deuterium]
├── Moon IIIa (ice): [water_ice, methane_ice]
└── Comet: [water_ice, ammonia_ice, nitrogen_ice]
```

Resources are infinite at location. Scarcity is:
- **Location** - Rare resources in few places
- **Time** - Mining takes hours
- **Distance** - Good resources far from stations
- **Cargo** - Can't carry infinite amounts

## Cargo System

### Ship Cargo Hold

```php
class CargoHold
{
    public float $capacity = 100.0;  // m³
    public array $contents = [];

    public function getUsed(): float
    {
        $used = 0;
        foreach ($this->contents as $item => $quantity) {
            $used += $quantity * $this->getVolume($item);
        }
        return $used;
    }

    public function getAvailable(): float
    {
        return $this->capacity - $this->getUsed();
    }

    public function canFit(string $item, int $quantity): bool
    {
        $volume = $quantity * $this->getVolume($item);
        return $volume <= $this->getAvailable();
    }
}
```

### Volume by Type

```
Raw Resources (bulky):
├── Ore: 0.1 m³/unit
├── Gas: 0.05 m³/unit (compressed)
├── Ice: 0.15 m³/unit
└── Organic: 0.2 m³/unit

Refined Materials (denser):
├── Metals: 0.02 m³/unit
├── Processed Gas: 0.01 m³/unit
├── Chemicals: 0.03 m³/unit
└── Compounds: 0.02 m³/unit

Components (varied):
├── Basic: 0.5 m³/unit
├── Standard: 1.0 m³/unit
├── Advanced: 2.0 m³/unit
└── Complex: 5.0 m³/unit

Products:
├── Modules: 10-50 m³ each
├── Consumables: 0.1-1.0 m³
└── Trade goods: varies
```

### Cargo Capacity Progression

```
Starter Ship:     100 m³
Light Freighter:  500 m³
Freighter:        2000 m³
Heavy Freighter:  10000 m³
```

Artifacts can expand capacity. Bigger ships = more expensive, slower, better targets.

## Refining

### Refining Work Unit

Raw resources must be refined before manufacturing:

```php
[
    'type' => 'refine',
    'params' => [
        'input' => [
            'iron_ore' => 100,
        ],
        'output' => 'iron',
        'station' => 'tau_ceti_station',
    ],
    'duration' => 7200,  // 2 hours
    'yields' => [
        'iron' => 50,    // 50% efficiency base
    ],
]
```

### Refining Requirements

```
Refining requires:
├── Station with refinery service
├── Raw resources in cargo
├── Time (work unit)
└── Credits (station fee)

Cannot refine on ship (usually).
Special artifact could enable shipboard refining.
```

### Refine Ratios

```php
const REFINE_RATIOS = [
    // Ores → Metals
    'iron_ore' => ['iron' => 0.5],
    'nickel_ore' => ['nickel' => 0.5],
    'copper_ore' => ['copper' => 0.4],
    'titanium_ore' => ['titanium' => 0.3],
    'platinum_ore' => ['platinum' => 0.2],
    'gold_ore' => ['gold' => 0.2],
    'rare_earth_ore' => ['rare_earth' => 0.1],

    // Gas → Processed
    'hydrogen' => ['hydrogen_fuel' => 0.8],
    'deuterium' => ['fusion_fuel' => 0.6],
    'helium_3' => ['advanced_fuel' => 0.5],

    // Ice → Liquids
    'water_ice' => ['water' => 0.9],
    'ammonia_ice' => ['ammonia' => 0.7],
    'methane_ice' => ['methane' => 0.8],
];
```

### Refining Efficiency

Artifacts and station quality affect yield:

```php
function calculateRefineYield(array $input, Station $station, ShipStats $stats): array
{
    $baseRatio = REFINE_RATIOS[$input['resource']];

    // Station efficiency (generated property)
    $stationBonus = $station->refinery_efficiency;  // 0.8 - 1.2

    // Artifact bonus
    $artifactBonus = $stats->get('refine_efficiency', 1.0);

    $finalRatio = $baseRatio * $stationBonus * $artifactBonus;

    // Cap at 100%
    return min($finalRatio, 1.0);
}
```

## Manufacturing

### Blueprints

Manufacturing requires blueprints:

```php
[
    'id' => 'bp_basic_mining_laser',
    'name' => 'Basic Mining Laser Blueprint',
    'category' => 'module',
    'output' => 'basic_mining_laser',
    'output_quantity' => 1,
    'inputs' => [
        'iron' => 50,
        'copper' => 20,
        'rare_earth' => 5,
    ],
    'time' => 14400,  // 4 hours
    'skill_required' => 'manufacturing_1',
    'facility_required' => 'factory',
]
```

### Blueprint Sources

```
How to get blueprints:
├── Station shops (common blueprints)
├── Discovery rewards (uncommon)
├── Anomalies (rare)
├── Research (unlock from data)
└── Trading (player to player)
```

### Manufacturing Work Unit

```php
[
    'type' => 'manufacture',
    'params' => [
        'blueprint' => 'bp_basic_mining_laser',
        'station' => 'tau_ceti_station',
        'runs' => 1,  // how many to make
    ],
    'inputs' => [
        'iron' => 50,
        'copper' => 20,
        'rare_earth' => 5,
    ],
    'duration' => 14400,
    'output' => [
        'basic_mining_laser' => 1,
    ],
]
```

### Production Chains

Example: Building a Mining Laser

```
MINING
├── Mine iron_ore (6h) → 100 iron_ore
├── Mine copper_ore (6h) → 60 copper_ore
└── Mine rare_earth_ore (6h) → 30 rare_earth_ore

REFINING (at station)
├── Refine iron_ore → 50 iron (2h)
├── Refine copper_ore → 24 copper (2h)
└── Refine rare_earth_ore → 3 rare_earth (2h)

MANUFACTURING (at station)
└── Build mining_laser (4h)
    Inputs: 50 iron, 20 copper, 5 rare_earth
    Output: 1 Basic Mining Laser

Total time: ~22 hours
Total station fees: ~500 credits
Result: Item worth ~2000 credits
```

### Product Categories

```
MODULES (ship equipment)
├── Mining
│   ├── Basic Mining Laser
│   ├── Strip Miner
│   └── Gas Collector
├── Navigation
│   ├── Sensor Array
│   ├── Jump Drive Upgrade
│   └── Autopilot Module
├── Defense
│   ├── Shield Generator
│   ├── Hull Plates
│   └── Point Defense
├── Cargo
│   ├── Cargo Expander
│   └── Ore Compressor
└── Engineering
    ├── Fuel Processor
    └── Repair Module

CONSUMABLES
├── Fuel cells
├── Repair nanites
├── Scan probes
└── Emergency beacons

STRUCTURES (station building - future)
├── Refinery module
├── Factory module
├── Market terminal
└── Defense platform

SHIPS (ambitious - future)
├── Scout
├── Freighter
├── Mining Barge
└── Explorer
```

## Markets

### Station Markets

Every station has a market:

```php
[
    'station' => 'tau_ceti_station',
    'market' => [
        'buy_orders' => [
            ['item' => 'iron_ore', 'price' => 4, 'quantity' => 10000],
            ['item' => 'copper_ore', 'price' => 8, 'quantity' => 5000],
        ],
        'sell_orders' => [
            ['item' => 'iron', 'price' => 12, 'quantity' => 500],
            ['item' => 'fuel_cells', 'price' => 100, 'quantity' => 50],
        ],
    ],
]
```

### NPC Orders

Stations generate NPC orders to bootstrap economy:

```php
function generateStationOrders(SeededRandom $rng, Station $station): array
{
    $orders = [];

    // Station buys local resources
    foreach ($this->getLocalResources($station) as $resource) {
        $orders[] = [
            'type' => 'buy',
            'item' => $resource,
            'price' => $this->getBasePrice($resource) * 0.8,  // Below base
            'quantity' => $rng->between(1000, 10000),
        ];
    }

    // Station sells refined goods
    foreach ($this->getStationProducts($station) as $product) {
        $orders[] = [
            'type' => 'sell',
            'item' => $product,
            'price' => $this->getBasePrice($product) * 1.2,  // Above base
            'quantity' => $rng->between(100, 1000),
        ];
    }

    return $orders;
}
```

### Player Orders

Players can create their own market orders:

```php
[
    'type' => 'sell',
    'item' => 'platinum',
    'price' => 500,
    'quantity' => 100,
    'ship_id' => 'ship-enterprise',
    'station' => 'tau_ceti_station',
    'expires_at' => 1706558400,  // 7 days
]
```

### Price Discovery

Origin tracks all transactions:

```php
class MarketService
{
    public function recordTransaction(Transaction $tx): void
    {
        // Record for price history
        $this->transactions->insert([
            'item' => $tx->item,
            'price' => $tx->price,
            'quantity' => $tx->quantity,
            'station' => $tx->station,
            'timestamp' => time(),
        ]);

        // Update moving average
        $this->updatePriceIndex($tx->item, $tx->station);
    }

    public function getAveragePrice(string $item, string $station = null): float
    {
        // Last 7 days of transactions
        return $this->transactions
            ->where('item', $item)
            ->where('timestamp', '>', time() - 604800)
            ->when($station, fn($q) => $q->where('station', $station))
            ->avg('price');
    }
}
```

### Arbitrage Opportunities

Different stations have different prices:

```
Tau Ceti Station (mining hub):
├── Iron Ore: 4 credits (cheap - local)
├── Platinum: 400 credits (expensive - rare here)
└── Fuel Cells: 120 credits (expensive - no refinery)

Epsilon Eridani Station (industrial):
├── Iron Ore: 7 credits (expensive - imported)
├── Platinum: 600 credits (expensive - rare)
└── Fuel Cells: 80 credits (cheap - local production)

Arbitrage: Buy iron at Tau Ceti, sell at Epsilon Eridani
Profit: 3 credits/unit × cargo capacity
```

## Trade Routes

### Route Calculation

```php
class TradeRouteCalculator
{
    public function findRoutes(Ship $ship): array
    {
        $routes = [];

        foreach ($this->getKnownStations($ship) as $from) {
            foreach ($this->getKnownStations($ship) as $to) {
                if ($from === $to) continue;

                $profit = $this->calculateRouteProfit($from, $to, $ship);

                if ($profit > 0) {
                    $routes[] = [
                        'from' => $from,
                        'to' => $to,
                        'profit' => $profit,
                        'cargo' => $this->getBestCargo($from, $to),
                        'travel_time' => $this->getTravelTime($from, $to),
                        'profit_per_hour' => $profit / ($this->getTravelTime($from, $to) / 3600),
                    ];
                }
            }
        }

        // Sort by profit per hour
        usort($routes, fn($a, $b) => $b['profit_per_hour'] <=> $a['profit_per_hour']);

        return $routes;
    }
}
```

### Trade Goods

Some items exist purely for trading:

```
TRADE GOODS
├── Luxury items (high value, low volume)
│   ├── Fine wines
│   ├── Art pieces
│   └── Rare artifacts
├── Industrial supplies (medium value, medium volume)
│   ├── Machine parts
│   ├── Electronics
│   └── Medical supplies
└── Bulk commodities (low value, high volume)
    ├── Food stuffs
    ├── Water
    └── Construction materials

Generated at stations, consumed at others.
Creates natural trade routes.
```

## Economy Flow

### Complete Loop

```
EXPLORATION
    │
    │ Find new system with platinum
    ▼
MINING
    │
    │ Mine platinum ore (6 hours)
    │ Yield: 30 units
    ▼
HAULING
    │
    │ Travel to station (4 hours)
    ▼
REFINING
    │
    │ Refine ore (2 hours)
    │ Yield: 6 platinum
    ▼
SELLING
    │
    │ Sell at market: 500 credits each
    │ Total: 3000 credits
    ▼
BUYING
    │
    │ Buy blueprint for better mining laser
    │ Cost: 2000 credits
    ▼
MANUFACTURING
    │
    │ Build mining laser (need materials)
    │ Gather materials, manufacture
    ▼
UPGRADING
    │
    │ Install new equipment
    │ Mining yield +20%
    ▼
REPEAT
    │
    │ More efficient loop
    ▼
```

### Value Chain

```
Raw ore:      5 credits/unit
Refined:      12 credits/unit  (140% markup)
Component:    50 credits/unit  (300% markup over materials)
Module:       500+ credits     (varies by complexity)

Value added at each step.
Profit opportunity at each step.
```

## Origin's Role

### What Origin Tracks

```
TRANSACTIONS
├── All market transactions
├── Price history
├── Volume by item/station
└── Player order books

PRODUCTION
├── Manufacturing jobs
├── Resource extraction totals
├── Blueprint distribution
└── Supply chain flow

ECONOMY HEALTH
├── Total money supply
├── Inflation indicators
├── Market liquidity
├── Wealth distribution
```

### Origin Doesn't Control

```
Origin is NOT a central bank:
├── Can't set prices (markets do)
├── Can't create resources (mining does)
├── Can't destroy items (players do)
└── Can't manipulate economy (hopefully)

Origin IS a record keeper:
├── Verifies transactions
├── Stores history
├── Provides price data
└── Tracks ownership
```

### Money Supply

Credits enter the system through:
```
SOURCES
├── First discovery bonuses
├── NPC station buy orders
├── Mission rewards (future)
└── Origin grants (bootstrap)

SINKS
├── Station fees (refining, manufacturing)
├── Market taxes
├── Blueprint costs
└── Travel costs (fuel from NPC)
```

## Summary

The Helm economy:

1. **Resources** - Raw materials mined from space
2. **Refining** - Process raw into usable materials
3. **Manufacturing** - Build items from materials
4. **Markets** - Buy/sell at stations
5. **Hauling** - Move goods for profit
6. **Blueprints** - Gate advanced production

Scarcity drivers:
- **Location** - Rare resources in few places
- **Time** - Everything takes hours
- **Distance** - Good stuff far from markets
- **Knowledge** - Finding the good spots

Player roles emerge:
- **Miners** - Extract and sell raw
- **Industrialists** - Manufacture goods
- **Traders** - Arbitrage between stations
- **Explorers** - Find new resource locations

It's Eve, but:
- On WordPress
- Async (hours, not minutes)
- Federatable (single Origin now, trade deals between Origins later)
- Open source

Spreadsheets in space.
