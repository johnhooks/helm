# Ships

## Overview

There are no ship classes. There's a hull and what you bolt onto it.

Every ship starts as the same first-generation hull — the **Pioneer frame**. What makes a ship a scout, a surveyor, or a hauler is the combination of core, drive, sensors, and equipment the pilot chooses to install. Roles are emergent, not prescribed.

This means:
- No wrong choice at creation
- Refit at a station to change roles
- Equipment combinations create personality
- The same hull tells a different story depending on who flies it

## The Pioneer Frame

Humanity's first interstellar-capable hull. Rugged, modular, built to be configured in the field.

```
PIONEER FRAME
├── Component Slots
│   ├── Warp Core      (1 slot)
│   ├── Drive          (1 slot)
│   ├── Sensors        (1 slot)
│   ├── Shields        (1 slot)
│   ├── Nav Computer   (tier 1-5)
│   └── Equipment      (3 slots)
│
├── Base Stats
│   ├── Hull Integrity: 100
│   ├── Total Internal Space: 300 m³
│   └── Equipment Slots: 3
│
└── Universal
    ├── Every ship can jump
    ├── Every ship can scan
    ├── Every ship can mine (slowly, without equipment)
    └── Equipment makes you GOOD at things
```

### Cargo Is What's Left

The Pioneer has 300 m³ of internal space. Components and equipment consume some of that space. Cargo capacity is whatever remains.

```
Total Internal Space:    300 m³
 - Core footprint:       varies by model
 - Drive footprint:      varies by model
 - Sensor footprint:     varies by model
 - Shield footprint:     varies by model
 - Equipment footprint:  varies by item
 ─────────────────────────────────
= Available Cargo:       what's left
```

The Pioneer is the only hull for now. Future generations may offer different slot counts, base stats, or special capabilities. But the first era of exploration happens on Pioneers.

## Components

Core components that every ship has. See `plans/.wip/ship-systems.md` for technical details.

### Warp Cores (Epoch Series)

The power source. Determines operational tempo and ship lifespan.

| Model | Life | Regen | Jump Cost | Footprint | Character |
|-------|------|-------|-----------|-----------|-----------|
| Epoch-E | 1000 ly | 5/hr | 0.75x | 20 m³ | Patient, enduring |
| Epoch-S | 750 ly | 10/hr | 1.0x | 25 m³ | Balanced, reliable |
| Epoch-R | 500 ly | 20/hr | 1.5x | 35 m³ | Aggressive, short-lived |

Hot cores need more cooling infrastructure. The Epoch-R's extra regen comes at a physical cost.

See `warp-core.md` for full details.

### Drives (DR Series)

How fast you go and how far you can jump.

| Model | Speed | Power Appetite | Range | Footprint | Character |
|-------|-------|----------------|-------|-----------|-----------|
| DR-305 | 0.5x | 0.6x | 10 ly | 20 m³ | Slow, efficient, long range |
| DR-505 | 1.0x | 1.0x | 7 ly | 30 m³ | Balanced |
| DR-705 | 2.0x | 1.5x | 5 ly | 45 m³ | Fast, hungry, short range |

Faster drives need bigger thrust assemblies and more fuel routing.

See `drives.md` for full details.

### Sensors

What you can see and how well you can see it.

| Model | Range | Survey Duration | Success Chance | Footprint | Character |
|-------|-------|-----------------|----------------|-----------|-----------|
| DSC Mk I | 20 ly | 2.0x | 0.6 | 40 m³ | Far sight, slow, unreliable |
| VRS Mk I | 12 ly | 1.0x | 0.7 | 25 m³ | Balanced |
| ACU Mk I | 6 ly | 0.5x | 0.85 | 15 m³ | Short range, fast, accurate |

Long-range sensor arrays are physically large — antenna arrays, signal processors, shielded receivers. The DSC eats a huge chunk of internal space.

### Shields (Aegis Series)

Protection. Less relevant until combat exists, but shields also protect against environmental hazards — radiation, debris fields, asteroid impacts during mining.

| Model | Capacity | Regen Rate | Footprint |
|-------|----------|------------|-----------|
| Aegis Alpha | 50 | 20/hr | 10 m³ |
| Aegis Beta | 100 | 10/hr | 20 m³ |
| Aegis Gamma | 200 | 5/hr | 35 m³ |

Heavy shields need emitter arrays and capacitor banks.

## Equipment

Equipment slots are what create roles. The Pioneer has 3 slots. Every piece of equipment you install means something else you can't.

### Available Equipment

Each piece takes one equipment slot and has a footprint that reduces available cargo.

```
MINING                                    FOOTPRINT
├── Mining Laser         - Belt extraction              10 m³
├── Deep Core Drill      - Higher yield, slower         20 m³
└── Gas Collector        - Gas giant extraction          15 m³

CARGO
├── Cargo Expander       - Frees up 50 m³ net          -50 m³ (adds space)
├── Ore Compressor       - Raw ore takes 50% less        5 m³
└── Refrigerated Hold    - Required for ice/organics    10 m³

DEPLOYMENT
├── Platform Deployer    - Deploy mining platforms       25 m³
├── Probe Launcher       - Extended sensor range         10 m³
└── Beacon Transmitter   - Mark locations, signals        5 m³

ENGINEERING
├── Repair Module        - Self-repair hull over time   15 m³
├── Refinery Module      - Process ore in flight         30 m³
└── Fuel Processor       - Convert ice to fuel           15 m³

NAVIGATION
├── Cloaking Device      - Reduces detection             20 m³
├── Long Range Antenna   - Extended signal reception     10 m³
└── Waypoint Scanner     - Rogue planet detection        15 m³
```

Three slots means hard choices. You can't do everything. And every piece of equipment you install shrinks your hold. The Cargo Expander is unique — it's structural modification that *adds* usable space, the only equipment with a negative footprint.

## Emergent Roles

No ship class system. These are just common loadouts that players will naturally converge on:

### "The Scout"

Optimized for finding things fast and far.

```
Core:    Epoch-R        35 m³
Drive:   DR-705         45 m³
Sensors: DSC Mk I       40 m³
Shields: Aegis Alpha    10 m³
                       ──────
Components:            130 m³

Equipment:
├── Waypoint Scanner    15 m³
├── Probe Launcher      10 m³
└── Cloaking Device     20 m³
                       ──────
Equipment:              45 m³

Total used:            175 m³
Available cargo:       125 m³
```

Fast, fragile, burns through cores. Sees everything, carries almost nothing. Sells location data and scan results. That 125 m³ is enough for supplies and whatever you scrape off a rogue planet, but you're not hauling ore.

### "The Surveyor"

The workhorse. Scans systems, mines belts, deploys infrastructure.

```
Core:    Epoch-S        25 m³
Drive:   DR-505         30 m³
Sensors: VRS Mk I       25 m³
Shields: Aegis Beta     20 m³
                       ──────
Components:            100 m³

Equipment:
├── Mining Laser        10 m³
├── Platform Deployer   25 m³
└── Repair Module       15 m³
                       ──────
Equipment:              50 m³

Total used:            150 m³
Available cargo:       150 m³
```

Balanced everything. 150 m³ is enough for a mining run and some spare parts. Does a bit of everything, not the best at anything, but can operate independently for weeks. The ship you'd want if you could only have one.

### "The Hauler"

Big cargo, long range, patient.

```
Core:    Epoch-E        20 m³
Drive:   DR-305         20 m³
Sensors: ACU Mk I       15 m³
Shields: Aegis Gamma    35 m³
                       ──────
Components:             90 m³

Equipment:
├── Cargo Expander     -50 m³  (adds space)
├── Cargo Expander     -50 m³  (adds space)
└── Ore Compressor       5 m³
                       ──────
Equipment:             -95 m³

Total used:             -5 m³  (net gain from expanders)
Available cargo:       305 m³
```

Slow, tough, enormous capacity. The small, efficient components leave room. The cargo expanders add more. 305 m³ with an ore compressor on top — that's a serious haul. Runs trade routes between stations, collects platform output, the backbone of the economy.

### Hybrid Loadouts

The three-slot system means interesting hybrids. Component choices shift the cargo math.

**The Prospector** (Scout + Surveyor)
```
Equipment: Waypoint Scanner (15) + Mining Laser (10) + Cloaking Device (20)
Equipment footprint: 45 m³
```
Finds rogue planets, mines them personally. Keeps the secret. Pair with scout components and you've got ~125 m³ for ore.

**The Logistics Ship** (Surveyor + Hauler)
```
Equipment: Platform Deployer (25) + Cargo Expander (-50) + Ore Compressor (5)
Equipment footprint: -20 m³
```
Deploys platforms AND hauls the output. With hauler components (90 m³), you get ~230 m³ cargo. Self-sufficient but slow.

**The Ghost Miner** (Surveyor + Scout)
```
Equipment: Mining Laser (10) + Cloaking Device (20) + Ore Compressor (5)
Equipment footprint: 35 m³
```
Sneaks into someone else's belt, mines what's there, vanishes. With balanced components (~100 m³), you keep ~165 m³ for ore — a decent haul for a stealth run.

## Refitting

Ships can be reconfigured at stations:

- Swap any component (core, drive, sensors, shields)
- Swap equipment in/out
- Core swap is expensive (old core is spent or sold)
- Equipment swap is cheap (just labor time)

Refitting takes time (async — queue the refit, check back later). This prevents instant role-switching in the field. You commit to a loadout for an expedition, then refit when you return.

A scout can become a hauler. A hauler can become a surveyor. Nothing is permanent except your ship's history.

## Components as Entities

Components are not configuration — they're physical objects with history. Every scanner, drive, core, and mining laser is an individual item that is manufactured, installed, used, transferred, damaged, repaired, salvaged, or scrapped.

### Data Model

```sql
helm_ship_stats
├── ship_post_id    BIGINT PK (FK → wp_posts)
├── hull_integrity  FLOAT
├── hull_max        FLOAT
├── power_full_at   DATETIME NULL
├── power_max       FLOAT
├── shields_full_at DATETIME NULL
├── shields_max     FLOAT
├── node_id         BIGINT NULL
├── cargo           JSON
├── current_action_id BIGINT NULL
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

helm_components
├── id              BIGINT PK AUTO_INCREMENT
├── type            VARCHAR(20)   -- core, drive, sensor, shield, equipment
├── model           VARCHAR(50)   -- epoch_e, dr_705, dsc_mk1, mining_laser...
├── usage_count     INT UNSIGNED DEFAULT 0
├── condition       FLOAT DEFAULT 1.0  -- 0.0 (destroyed) to 1.0 (pristine)
├── created_by      BIGINT NULL   -- player who manufactured/purchased
├── owner_history   JSON          -- [{player_id, from, to}, ...]
├── origin          VARCHAR(20)   -- 'manufactured', 'salvaged', 'starter'
├── origin_ref      BIGINT NULL   -- wreck ID if salvaged, station if purchased
├── created_at      TIMESTAMP
├── updated_at      TIMESTAMP

helm_ship_components (pivot)
├── ship_post_id    BIGINT (FK → wp_posts)
├── component_id    BIGINT (FK → helm_components)
├── slot            VARCHAR(20)   -- core, drive, sensor, shield, equip_1/2/3
├── installed_at    TIMESTAMP
├── UNIQUE(ship_post_id, slot)
├── UNIQUE(component_id)  -- a component can only be in one ship
```

### Component State

Every component has two state axes:

**Usage** (`usage_count`) — how many successful actions it's participated in. Drives the buff/nerf curve. Only goes up. This is the component's experience.

**Condition** (`condition`) — physical state from 0.0 to 1.0. Damaged by wrecks, combat, environmental hazards. Restored through repair (costs resources). Below 0.05 condition, component is scrap-only — too far gone to repair.

```
USAGE vs CONDITION

Usage is permanent history:
├── 0 uses: factory fresh, no buffs
├── 1000 uses: noticeable improvement, minor power increase
├── 5000 uses: significant buff, meaningful nerf
└── 10000+ uses: rare, highly sought after

Condition is repairable state:
├── 1.0: pristine
├── 0.7: functional, minor damage
├── 0.3: degraded, needs repair soon
├── 0.1: barely functional
└── 0.05: scrap threshold — cannot be repaired
```

### Wear Curves

Usage creates paired buffs and nerfs. The curve is logarithmic — early use matters most, veterans plateau.

```
SCANNER (DSC Mk I)
├── Buff: accuracy     +0% → +15% → +30% → +40% (log curve)
├── Nerf: power draw   1.0x → 1.2x → 1.5x → 1.8x
└── At 10000 uses: incredibly accurate, power hungry

DRIVE (DR-705)
├── Buff: spool time   1.0x → 0.9x → 0.8x → 0.75x
├── Nerf: fuel cost    1.0x → 1.1x → 1.3x → 1.5x
└── At 10000 uses: fast ignition, drinks fuel

MINING LASER
├── Buff: precision    +0% → +10% → +20% → +25% yield
├── Nerf: cycle time   1.0x → 1.1x → 1.2x → 1.3x
└── At 10000 uses: high yield per cycle, but slower cycles

WARP CORE (Epoch-S)
├── Buff: stability    1.0x → 1.05x → 1.1x → 1.15x output
├── Nerf: capacity     750 → 720 → 690 → 660 effective ly
└── At 10000 uses: slightly more output, slightly less total life
```

### Component Lifecycle

```
MANUFACTURED (at station or by player)
│  condition: 1.0, usage: 0
│  created_by: player ID
│  origin: 'manufactured'
│
├─→ INSTALLED in ship (pivot row created)
│   │  usage_count increments with each successful action
│   │  buffs emerge over time
│   │
│   ├─→ UNINSTALLED at station (pivot row deleted)
│   │   │  component goes to player inventory
│   │   │  can be reinstalled, sold, or scrapped
│   │   │
│   │   ├─→ SOLD on market (owner_history appended)
│   │   ├─→ SCRAPPED for materials (component deleted)
│   │   └─→ INSTALLED in another ship
│   │
│   └─→ SHIP DESTROYED (wreck created)
│       │  pivot row deleted
│       │  condition reduced (wreck damage)
│       │  component persists at wreck coordinates
│       │
│       ├─→ SALVAGED by another player
│       │   │  owner_history appended
│       │   │  origin_ref: wreck ID
│       │   │  still needs REPAIR before use
│       │   │
│       │   ├─→ REPAIRED at station (condition restored, costs resources)
│       │   │   └─→ INSTALLED, SOLD, etc.
│       │   │
│       │   └─→ SCRAPPED (too damaged or not worth repairing)
│       │
│       └─→ LEFT IN WRECK (waiting to be found)
│
└─→ SCRAPPED immediately (player doesn't want it)
    └── Returns fraction of manufacturing materials
```

### Repair vs. Scrap Decision

When you find a component, the math determines what it's worth:

```
REPAIR COST
├── Base: manufacturing cost × (1.0 - condition)
├── A component at 0.3 condition costs ~70% of new to repair
├── A component at 0.8 condition costs ~20% of new to repair
└── Below 0.05 condition: unrepairable, scrap only

SCRAP VALUE
├── Returns ~30% of original manufacturing materials
├── Always available regardless of condition
├── Destroys the component permanently
└── No buffs preserved

THE DECISION
├── High usage + repairable condition → repair (buffs are valuable)
├── Low usage + low condition → scrap (not worth the repair cost)
├── High usage + barely repairable → gamble (expensive but rare item)
└── Any condition below 0.05 → scrap only
```

Example: you find a DSC Mk I scanner in a wreck. 8,400 uses, condition 0.2.

```
New DSC Mk I cost:     200 iron + 80 copper + 30 rare_earth
Repair cost (80%):     160 iron + 64 copper + 24 rare_earth
Scrap value (30%):     60 iron + 24 copper + 9 rare_earth

But this scanner has +35% accuracy from 8,400 uses.
A new one has +0%.
You can't buy that. Repair it.
```

### Worn Equipment Market

High-usage components in good condition are the most valuable items in the game. They represent real time investment that cannot be shortcut.

```
MARKET VALUE FACTORS
├── Model (base value)
├── Usage count (buff level — logarithmic value)
├── Condition (repair cost to buyer)
└── Provenance (cool history is worth... nothing mechanically, but players care)
```

A 10,000-use scanner is rare because someone (or something) spent months building those scans. It might be worth 10x a new one. This creates a genuine secondary market:

- Manufacturers sell new components (baseline)
- Salvagers sell recovered components (damaged but experienced)
- Veterans sell their old gear when upgrading (premium)
- Station markets list components with full stats visible

### Bots and the Economy

In an async game with webhook automation, bot fleets grinding component usage are inevitable. Rather than fighting this:

- Bot fleets grinding scanners are *manufacturing* high-usage components through time investment
- This is just industrialism — creating value through labor
- Hunting bot fleets and salvaging their components is its own gameplay loop
- The economy absorbs it: more supply of worn gear drives prices down
- The real scarcity is the components with *extreme* usage (years of grinding)

## Player Progression

Separate from ship/component wear. Player experience persists across ships — lose your Pioneer, keep your skills.

### Experience Counters

Stored as WordPress user meta. Incremented on successful action completion.

```
wp_usermeta
├── helm_scans_completed      → scan success bonus
├── helm_mines_completed      → yield reading bonus
├── helm_jumps_completed      → fuel efficiency bonus
├── helm_routes_discovered    → nav computation bonus
├── helm_platforms_deployed   → deployment speed bonus
├── helm_trades_completed     → market insight bonus
└── helm_salvages_completed   → condition assessment bonus
```

### Player Buff Curve

Logarithmic — early actions matter most, veterans plateau.

```
buff = base_bonus × log(1 + count) / log(1 + max_meaningful_count)

At 0 actions:    0% bonus
At 100 actions:  ~50% of max bonus
At 500 actions:  ~80% of max bonus
At 1000 actions: ~90% of max bonus
At 5000 actions: ~98% of max bonus (effectively capped)
```

The difference between 0 and 100 scans is huge. The difference between 1000 and 2000 is marginal. This keeps veterans better without making new players helpless.

### Player + Component Stacking

A veteran pilot's buffs stack with component wear buffs:

```
SCAN ACCURACY
├── Base:           60% (DSC Mk I)
├── Component buff: +35% (8,400 uses)
├── Player buff:    +8% (847 scans completed)
└── Effective:      ~80%

A veteran in a veteran ship is formidable.
A veteran in a fresh ship is still competent.
A rookie in a veteran ship benefits from the gear.
A rookie in a fresh ship has baseline — still playable.
```

Losing your ship hurts — those component buffs are gone until you find or buy replacements. But you're not starting from zero. Your player buffs carry over immediately.

## Wrecks and Salvage

Ships don't disappear when destroyed or abandoned. They persist as wrecks at their last coordinates.

### Wreck Contents

```
WRECK
├── Hull (damaged, potentially repairable for scrap materials)
├── Components (all installed components, condition reduced)
│   ├── Core (may have remaining life)
│   ├── Drive
│   ├── Sensors
│   ├── Shields
│   └── Equipment (1-3 items)
├── Cargo (whatever was in the hold)
└── Location (coordinates where ship was lost)
```

### Wreck Discovery

Wrecks are hidden until scanned. They appear as anomalies to ships scanning the area. A wreck in a well-traveled system is found quickly. A wreck in deep space might sit for months.

### Partial Salvage

A ship can only take what fits in its cargo hold. A gunship raids a wreck, grabs the high-value components that fit, and leaves. The rest stays.

```
RAIDER (125 m³ cargo)
├── Takes: DSC Mk I sensor (40 m³) — 8,400 uses, valuable
├── Takes: Epoch-R core (35 m³) — 200 ly remaining
├── Takes: 50 m³ of platinum ore from cargo
├── Leaves: Drive, shields, mining laser, remaining cargo
└── Wreck persists with remaining contents

SALVAGER finds it later (150 m³ cargo)
├── Takes: DR-505 drive (30 m³)
├── Takes: Aegis Beta shields (20 m³)
├── Takes: Mining laser (10 m³)
├── Takes: remaining cargo
└── Wreck is now stripped — hull remains for scrap
```

### The Universe Accumulates

Over time, the game world fills with derelicts:

- **Core systems**: Wrecks found and salvaged quickly
- **Popular routes**: Occasional finds along well-traveled waypoints
- **Deep frontier**: Wrecks sit for months, pristine salvage waiting
- **The void**: Ships that ran out of core life mid-jump, drifting forever until someone scans the right waypoint

Early game: empty space, fresh belts, no wrecks. A year in: depleted belts near Sol, derelicts along popular routes, a graveyard near contested sectors. The game world accumulates history that players create.

## Ship Identity

What makes YOUR ship unique isn't a class — it's:

- **Component history** — each piece has its own story, usage, and buffs
- **Loadout choices** — what you bolted on and what you left behind
- **Wear patterns** — which components are well-used, what buffs emerged
- **Name** — the thing you typed when you created it and never want to lose

Two Pioneers with identical loadouts play differently because of their component wear. Your scanner has 10,000 scans on it — it finds things others miss but drinks power. Your drive has been through 500 jumps — it spools up fast but burns fuel. That's not a stat sheet, it's a personality.

The ship is the character. The components are its organs. And when it dies, those organs can live on in someone else's ship.

## Future Hulls

The Pioneer won't be the only hull forever. Future generations might include:

- **Larger frames** — more equipment slots, more internal space, more expensive
- **Specialized frames** — built-in mining capability, extra sensor arrays
- **Salvaged frames** — alien hulls found in derelicts, unusual slot configurations
- **Player-built frames** — manufacturing endgame, custom designs

But for the first era of Helm, everyone flies a Pioneer. The variety comes from what you do with it.
