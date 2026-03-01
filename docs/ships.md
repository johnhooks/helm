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

### Power Budget

A ship can't run everything at full spec. Every component draws power from the core, and total draw competes against core output.

```
POWER BUDGET
├── Core Output (base × power mode)
│   ├── Epoch-E Normal: 0.9 × 1.0 = 0.9
│   ├── Epoch-S Normal: 1.0 × 1.0 = 1.0
│   └── Epoch-R Normal: 1.1 × 1.0 = 1.1
│
├── Component Draw (sum of all installed)
│   ├── Drive consumption:   0.6 - 1.5
│   ├── Sensor draw:         varies
│   ├── Shield draw:         varies
│   └── Equipment draw:      varies
│
└── Performance Ratio
    ├── output >= draw: everything runs at 100%
    └── output < draw:  systems underperform proportionally
```

This is the constraint that prevents "just install the best of everything." A Boost drive (1.5x consumption) + a DeepScan sensor + heavy shields will exceed what most cores can feed. Something has to give — either pick a smaller component, upgrade the core, or accept degraded performance across the board.

The interesting tension: upgrading one component might push total draw past the budget, making another component worse. A pilot who understands their power budget builds a more capable ship than one who chases top-spec parts.

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

| Model | Sustain Range | Survey Duration | Success Chance | Footprint | Character |
|-------|---------------|-----------------|----------------|-----------|-----------|
| DSC Mk I | 7 ly | 2.0x | 0.6 | 40 m³ | Far sight, slow, unreliable |
| VRS Mk I | 5 ly | 1.0x | 0.7 | 25 m³ | Balanced |
| ACU Mk I | 3 ly | 0.5x | 0.85 | 15 m³ | Short range, fast, accurate |

Long-range sensor arrays are physically large — antenna arrays, signal processors, shielded receivers. The DSC eats a huge chunk of internal space.

### Shields (Aegis Series)

Protection. Less relevant until combat exists, but shields also protect against environmental hazards — radiation, debris fields, asteroid impacts during mining.

| Model | Capacity | Regen Rate | Footprint |
|-------|----------|------------|-----------|
| Aegis Alpha | 50 | 20/hr | 10 m³ |
| Aegis Delta | 100 | 10/hr | 20 m³ |
| Aegis Eta | 200 | 5/hr | 35 m³ |

Heavy shields need emitter arrays and capacitor banks.

## Product Evolution

Components improve along two axes — **marks** and **versions**.

### Marks (New Hardware)

A mark is a new generation of hardware. ACU Mk I → ACU Mk II → ACU Mk III. Each mark is a significant capability jump — better base stats, sometimes new capabilities that didn't exist at lower marks. Getting a new mark means acquiring new physical equipment: manufacturing it, buying it, or salvaging it.

Marks don't just scale numbers up uniformly. Higher marks shift the tradeoff curve — the archetype's weakness becomes less punishing while the strength grows. A DSC Mk I (DeepScan) has great range but terrible survey speed. A DSC Mk III still has the best range, but the survey penalty has softened from 2.0x to maybe 1.4x. The archetype identity persists, but it becomes more capable overall.

New marks also introduce entirely new archetypes that don't exist at lower tiers. A Mk I sensor comes in three flavors (DSC, VRS, ACU). Mk II might add a fourth — a military-spec array that trades range for ship detection capability. Mk III might add a fifth. The design space expands as the tech evolves.

### Versions (Manufacturing Runs)

A version is a manufacturing run. When a product needs to be buffed or nerfed, the manufacturer doesn't patch existing hardware — they release a new version. Stations and factories start producing the new run. The old run stops manufacturing but every unit already in the game stays exactly as it is.

ACU Mk I v1 → ACU Mk I v2 isn't a firmware update. It's a retooled production line. The v1 units out in the world are legacy hardware. They can be used, repaired, bought, sold, and salvaged — but they can't be manufactured anymore. Only the current version rolls off the line.

This creates real economics:

- **A nerfed product where v1 was strong** — v1 units become scarce over time as they break down and get salvaged. Collectors and veterans hold onto them. The price climbs.
- **A buffed product where v1 was weak** — v1 units become cheap junk. New players pick them up as beaters. Veterans sell off their old stock.
- **A v3 that reverts closer to v1** — the collectors suddenly have competition again.

Versions are how balance changes ship without erasing history. The game's economy remembers every manufacturing run. A pilot flying a v1 DR-705 is flying a piece of history — and everyone in the system knows it.

### Progression Shape

```
SENSOR EVOLUTION (example)

Mk I (launch)
├── DSC Mk I    — deep range, slow survey
├── VRS Mk I    — balanced
└── ACU Mk I    — short range, fast/accurate

Mk II (mid-game)
├── DSC Mk II   — deeper range, survey penalty softened
├── VRS Mk II   — better all-around
├── ACU Mk II   — moderate range now, very fast
└── NEW: MIL Mk II — military detection array

Mk III (endgame)
├── DSC Mk III  — extreme range, reasonable survey speed
├── VRS Mk III  — genuinely good at both roles
├── ACU Mk III  — competitive range, surgical precision
├── MIL Mk III  — tracking and targeting specialist
└── NEW: ??? Mk III — something weird from a crossover manufacturer
```

Most products may never need a v2. Versions only appear when balance demands it — not on a schedule.

### Manufacturer Crossovers

Components come from manufacturers — Epoch Labs makes cores, the Aegis Foundry makes shields, and so on. Each manufacturer has a philosophy and a specialty. See `manufacturers.md` for full details.

The interesting wrinkle: manufacturers sometimes release products outside their core competency. Aegis (shields) releases a drive. Epoch Labs (cores) releases a sensor array. These crossover products are objectively worse in their adopted category — but they carry some unique property from the manufacturer's home domain that can't exist in a native product.

An Aegis drive might regenerate shields during warp transit. An Epoch sensor might bypass the normal power cost by tapping the core directly. These aren't better — they're *different* in a way that creates builds nobody planned for.

Crossover products don't appear at Mk I. They show up at Mk II or Mk III, when the manufacturer has had time to experiment outside their comfort zone.

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
├── Veil Array           - EM emission suppression        20 m³
├── Long Range Antenna   - Extended signal reception     10 m³
└── Waypoint Scanner     - Rogue planet detection        15 m³

DEFENSIVE
├── Point Defense System - Anti-torpedo interception        10 m³
└── ECM Module           - Degrades enemy sensor lock       15 m³

WEAPONS
├── Phaser Array         - Sustained shield drain           15 m³
└── Torpedo Launcher     - Burst damage, limited ammo       25 m³
```

Weapons are equipment. Any hull can slot a phaser or torpedo launcher if it has a free equipment slot. The question is whether the power budget survives it. See **Weapon Systems** below.

Three slots means hard choices. You can't do everything. And every piece of equipment you install shrinks your hold. The Cargo Expander is unique — it's structural modification that *adds* usable space, the only equipment with a negative footprint.

## Emergent Roles

No ship class system. These are just common loadouts that players will naturally converge on:

### "The Scout"

Optimized for finding things fast and far. Runs on the Scout Frame (250 m³, 2 equipment slots).

```
Hull:    Scout Frame
Core:    Epoch-R        35 m³
Drive:   DR-705         45 m³
Sensors: DSC Mk I       40 m³
Shields: Aegis Alpha    10 m³
                       ──────
Components:            130 m³

Equipment:
├── Waypoint Scanner    15 m³
└── Probe Launcher      10 m³
                       ──────
Equipment:              25 m³

Total used:            155 m³
Available cargo:        95 m³
```

Fast, fragile, burns through cores. The Scout's entire drive envelope is compressed — 30% faster spool, 30% faster cooldown. A DR-705 spools in 1.4 minutes instead of 2, and the cooldown signature fades in ~2 minutes instead of 3. You arrive quiet, do your thing, and if anything hostile shows up, you're jumping out before they can close.

The 0.6× hull signature means passive sensors take longer to build a track on you. Combined with the spool bonus, the escape loop is: detect threat → spool (1.4 min) → jump. A Striker's phasers barely scratch your shields in 1.4 minutes. A Specter's torpedo is still in flight when you're gone — if you caught the launch pulse.

The "not every time" factors: you didn't detect the threat (noisy system, wrong sensor), you were mid-action (cancelling a deep scan costs time), or multiple attackers caught you from different angles. But a vigilant Scout with an ACU sensor reliably escapes 1v1 engagements.

### "The Surveyor"

The workhorse. Scans systems, mines belts, deploys infrastructure.

```
Core:    Epoch-S        25 m³
Drive:   DR-505         30 m³
Sensors: VRS Mk I       25 m³
Shields: Aegis Delta     20 m³
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

Big cargo, long range, patient. The Bulwark Frame is built for this.

```
Hull:    Bulwark Frame
Core:    Epoch-E        20 m³
Drive:   DR-305         20 m³
Sensors: ACU Mk I       15 m³
Shields: Aegis Eta      35 m³
                       ──────
Components:             90 m³

Equipment:
└── Cargo Expander     -75 m³  (Bulwark bonus: 75 m³ instead of 50)
                       ──────
Equipment:             -75 m³

Total used:             15 m³
Available cargo:       585 m³
```

The Bulwark's 600 m³ internal space plus the enhanced Cargo Expander (75 m³ on this hull instead of the standard 50) creates a monster hauler from a single equipment slot. But that single slot is all you get — no mining, no defense, no utility. You haul cargo and nothing else.

Compare to a Pioneer hauler with 3 equipment slots:

```
Hull:    Pioneer Frame
Equipment:
├── Cargo Expander     -50 m³
├── Cargo Expander     -50 m³
└── Ore Compressor       5 m³
                       ──────
Equipment:             -95 m³

Components:             90 m³ (same)
Total used:             -5 m³
Available cargo:       305 m³
```

The Bulwark hauls 585 m³ vs the Pioneer's 305 m³ — nearly double. But the Pioneer hauler has 3 equipment slots (defense, mining, compression), while the Bulwark has 1. The Pioneer hauler is self-sufficient; the Bulwark is a pure cargo mule that needs escorts and station infrastructure.

The Bulwark's 150 integrity and Aegis Eta shields mean it can survive an ambush long enough for help to arrive — but at 1.4× mass and 1.4× signature, everyone knows where you are and you're expensive to move. The DR-305's efficiency partially offsets the mass penalty, but a Bulwark jump still costs 40% more power than the same distance on a Pioneer.

### Hybrid Loadouts

The three-slot system means interesting hybrids. Component choices shift the cargo math.

**The Prospector** (Scout + Surveyor)
```
Equipment: Waypoint Scanner (15) + Mining Laser (10) + Veil Array (20)
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
Equipment: Mining Laser (10) + Veil Array (20) + Ore Compressor (5)
Equipment footprint: 35 m³
```
Sneaks into someone else's belt, mines what's there, vanishes. With balanced components (~100 m³), you keep ~165 m³ for ore — a decent haul for a stealth run.

### "The Striker"

Glass cannon. Hits hard, can't take a hit.

```
Hull:    Striker Frame
Core:    Epoch-R        35 m³
Drive:   DR-705         45 m³
Sensors: ACU Mk I       15 m³
Shields: Aegis Alpha    10 m³
                       ──────
Components:            105 m³

Equipment:
├── Phaser Array       15 m³
└── Phaser Array       15 m³
                       ──────
Equipment:              30 m³

Total used:            135 m³
Available cargo:        65 m³

Power budget (while firing both phasers):
├── Core output:       1.1 (Epoch-R)
├── Drive draw:        0.42 (DR-705 base, not jumping)
├── Phaser draw:       0.35 × 2 × 0.6 (hull bonus) = 0.42
├── Total draw:        ~0.84
└── perfRatio:         1.0 — everything runs clean
```

Dual phasers, fast drive, minimum defense. The Striker's 0.6× weapon draw multiplier makes this loadout viable — the same build on a Pioneer would hit 0.74 perfRatio and stall. Almost no cargo, fragile hull. And with dual phasers armed, the Alpha's 50 capacity drops to 25 (each array reduces cap by 25%). That's barely a shield — one torpedo could punch straight through to hull. The Striker commits to being a glass cannon the moment it arms up. Disarming to recover full shields takes a spin-down cycle, so you can't toggle reactively when a torpedo is inbound. If a Specter's torpedo arrives while you're combat-ready with 25 effective shield and 75 hull, the math is ugly.

### "The Specter"

Silent killer. Hard to find, not impossible.

```
Hull:    Specter Frame
Core:    Epoch-E        20 m³
Drive:   DR-305         20 m³
Sensors: ACU Mk I       15 m³
Shields: Aegis Alpha    10 m³
                       ──────
Components:             65 m³

Equipment:
├── Veil Array         20 m³
└── Torpedo Launcher   25 m³
                       ──────
Equipment:              45 m³

Total used:            110 m³
Available cargo:        90 m³
Torpedo ammo (×4):     -80 m³
Remaining cargo:        10 m³ — nearly single-purpose

Power budget (cloaked, not firing):
├── Core output:       0.9 (Epoch-E)
├── Drive draw:        0.17 (DR-305 base)
├── Veil draw:         0.20 (0.40 × 0.5 hull bonus)
├── Shields:           OFFLINE (cloak suppresses shield field)
├── Total draw:        ~0.37
└── perfRatio:         1.0 — whisper quiet, zero defense

Power budget (firing torpedo):
├── Brief spike during firing cycle
├── Returns to baseline immediately after
├── Each launch is a separate pulse detection event
└── perfRatio: barely dips
```

Low-output core, slow drive, shields offline — the Specter trades all defense for stealth. While the Veil Array is active, shield field geometry is incompatible with emission suppression. Shields go dark. The Epoch-E's 1000 ly lifespan means you can stay out for weeks, creeping between systems on a DR-305 so quiet that even the drive spool is hard to detect. But "hard to detect" isn't "undetectable." The 0.5× hull signature reduces detection, it doesn't eliminate it. A DSC array with enough integration time will build a track. A MIL sensor with high active+passive capability can find you faster. The Specter's advantage is time — it takes longer to find, not impossible.

The ACU sensor catches pulse emissions from other torpedo boats and drive spools, making the Specter a natural counter to other combat ships. But carrying 4 torpedoes at ~20 m³ each leaves only 10 m³ of cargo — barely enough for supplies. This is a single-purpose combat boat that needs to resupply after one engagement.

Phasers on a Specter are mechanically possible but self-defeating: the continuous emission negates the cloak. You'd be paying for stealth hardware while broadcasting your position.

**Ambush scenario — Specter vs Striker:** A Striker mid-engagement is a tempting target — continuous emission lighting it up for every sensor in range, 75 hull. The Specter detects the phaser emission, closes cloaked (shields offline, zero defense), and launches a torpedo.

The outcome depends on the Striker's weapon state when the torpedo arrives:

*Phasers armed (shields at 25):* The torpedo punches through the halved Alpha and bites hull. But the Striker's phasers are already hot — if the ACU caught the launch pulse, it can lock the Specter and retaliate immediately. Phasers on 60 bare hull with zero shields ends the Specter before torpedo #2 arrives. The Striker takes damage but wins the fight.

*Phasers disarmed (shields at 50):* The full Alpha absorbs more of the hit — the Striker survives in better shape. But now it needs to spin up phasers to fight back, and that takes time. The second torpedo might land before weapons are online. The Striker survives longer but can't retaliate.

This is the Striker's core dilemma: armed means vulnerable to the first hit but able to fight back, disarmed means surviving the first hit but defenseless against the second. The right answer depends on whether you detect the Specter — which you can't know in advance. The ambush favors the Specter, but an armed Striker that catches the launch pulse can turn it around fast.

**Balance notes:** The Specter is constrained by: shields offline while cloaked (zero defense if found), single-fire torpedoes (each launch is a detection event), magazine of 4 (one engagement per sortie), 10 m³ remaining cargo (can't multitask), and travel time on torpedoes (target can spool out if they detect the pulse). The Specter is patient and lethal, not invincible.

## Weapon Systems

Combat in Helm is an action you issue and check back on, like everything else. "Attack that ship" follows the same pattern as "scan that system" or "jump to that star." There is no positioning, no grid, no manual piloting. You commit to an engagement and the simulation resolves it over time.

### Phasers

The sustained pressure weapon. Lock on, drain shields, wait.

- **Continuous shield drain** over hours. Low damage per tick but relentless.
- **Constant power draw** (0.35 per array). While firing, your perfRatio drops. Everything else on the ship suffers — scans slow down, jump range shrinks, shields regen slower.
- **Shield capacity reduction while armed.** Phaser field harmonics interfere with shield emitter geometry, physically shrinking the maximum shield envelope. Each armed phaser array reduces shield capacity by 25%. Dual phasers = 50% capacity reduction. An Aegis Alpha (50 cap) drops to 25. An Aegis Delta (100 cap) drops to 50. This penalty applies while phasers are armed and ready — not just while firing. Disarming takes a spin-down cycle, creating a commitment window. You choose to be combat-ready knowing your shields are halved for the duration.
- **Continuous EM emission**. Phasers produce a `continuous` spectral signature while active. Every DSC sensor in range is building confidence on your position. You cannot fire from stealth.
- **No ammo**. Phasers draw power, not physical resources. You can fire as long as your core lives.
- **Requires sensor lock**. If the target breaks lock (jump, ECM, cloak), damage stops. Re-establishing lock takes time.
- **Compact** (15 m³). Fits in any equipment slot without dominating the footprint budget.

Phasers are the pursuit weapon. You chase someone down and grind. The tradeoff is that your shields are permanently diminished while you're combat-ready — a phaser boat is the loudest, most exposed thing in the system. Disarm to get full shields back, but the spin-down cycle means you can't toggle reactively. You commit to offense or defense, not both.

### Torpedoes

The ambush weapon. Fire and forget, then disappear.

- **High burst damage**. A single torpedo deals massive alpha — enough to crack a reduced shield or severely damage a light one. But a single hit won't kill a reasonably equipped target. Expect 2-3 torpedoes to finish a ship with full shields. Against a Striker with phaser-halved shield capacity? Maybe two.
- **Single-fire launcher**. One torpedo at a time. Each launch is a separate firing cycle with its own detection risk. Sequential shots give the target (and anyone nearby) multiple chances to detect the pulse signature and react.
- **Magazine of 4**. Each torpedo is a physical item (~20 m³ cargo per round). Four rounds is one real engagement — maybe a kill with 2-3 hits and a round to spare, or a miss and a hard decision about your remaining shots. When you're out, you resupply at a station.
- **Power spike on launch**, then done. The launcher draws power for the firing cycle only, not continuously. Your perfRatio recovers immediately after firing.
- **Low EM emission**. Torpedo launches produce a brief `pulse` signature — a short spike, then silence. The torpedo itself is a cold, unpowered projectile coasting to target. Far harder to detect than sustained phaser fire. But each shot is a separate pulse event — fire three torpedoes, that's three chances for an ACU to catch you.
- **Travel time**. Torpedoes take minutes to reach the target. If the target detects the launch signature and spools their drive fast enough, they can jump out before impact.
- **Can miss**. Hit probability depends on range, target drive state, and your sensor accuracy. A target in active drive spool is harder to hit (signature changing, position uncertain). Component experience on your sensor improves targeting.
- **Bulky** (25 m³ launcher, plus ~20 m³ per torpedo in cargo). A full loadout of 4 rounds eats 80 m³ of cargo. On a Specter with 90 m³ available, that leaves almost nothing — the boat is single-purpose when loaded for combat.

Torpedoes are the submarine weapon. Sneak in, fire from the dark, disappear. The launch pulse is brief and easy to miss — unlike phasers, a torpedo boat can fire and go quiet before anyone builds a detection track. But each torpedo is a separate detection event, ammo is severely limited, and a single hit isn't a kill. The Specter's advantage is patience, not firepower.

### The Tradeoff

| | Phasers | Torpedoes |
|---|---|---|
| Damage pattern | Sustained drain | Burst alpha (2-3 hits to kill) |
| Power cost | Constant draw (tanks perfRatio) | Per-shot spike (recovers after) |
| Ammo | Unlimited (power only) | 4 rounds (~20 m³ each in cargo) |
| Fire rate | Continuous | One at a time |
| Shield penalty | -25% shield capacity per armed array | None |
| EM signature | Continuous (loud, trackable) | Brief pulse per shot (covert) |
| Counter | Break sensor lock | Evade before impact (if you detect the pulse) |
| DSP counter-sensor | DSC (continuous specialist) | ACU (pulse specialist, per launch) |
| Range | Short (must maintain lock) | Long (fire and forget) |
| Footprint | 15 m³ | 25 m³ launcher + 80 m³ ammo cargo |
| Playstyle | Pursuit predator | Ambush predator |

You can mix — one phaser and one torpedo launcher — but the power budget rarely supports it well, and you're mediocre at both styles. Most combat pilots specialize.

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

PHASER ARRAY
├── Buff: spin-up      1.0x → 0.85x → 0.70x → 0.60x (faster arm/disarm)
├── Nerf: shield penalty  25% → 27% → 30% → 33% capacity reduction
└── At 100 uses: near-instant weapon toggle, but shields suffer more

TORPEDO LAUNCHER
├── Buff: targeting     +0% → +10% → +20% → +25% hit probability
├── Nerf: launch pulse  1.0x → 1.2x → 1.5x → 1.8x emission signature
└── At 100 uses: rarely misses, but everyone hears the shot
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
├── helm_salvages_completed   → condition assessment bonus
├── helm_phaser_engagements   → spin-up speed, lock stability
└── helm_torpedo_launches     → targeting accuracy, reload timing
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
├── Component buff: +10% (8,400 uses)
├── Player buff:    +25% (847 scans completed)
└── Effective:      ~78%

PHASER SPIN-UP
├── Base:           1.0x (factory phaser array)
├── Component buff: 0.90x (65 uses — slightly faster toggle)
├── Player buff:    0.70x (40 phaser engagements — muscle memory)
└── Effective:      ~0.63x spin-up time

Player skill is always the bigger multiplier. Components come and
go — destroyed, scrapped, sold, salvaged. The player persists.
A veteran pilot in a fresh ship is still dangerous. A rookie in
a veteran ship gets a moderate edge from the gear but can't match
the pilot who earned the skills.

A veteran Striker pilot with a seasoned phaser array can run
disarmed (full shields), take the first torpedo on a full Alpha,
and spin up phasers before the second torpedo arrives. A rookie
with the same array still has to choose: armed or disarmed.

A veteran in a veteran ship is formidable.
A veteran in a fresh ship is still dangerous.
A rookie in a veteran ship gets a moderate gear edge.
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
├── Takes: Aegis Delta shields (20 m³)
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

## Hull Evolution

The Pioneer won't be the only hull forever. Hulls are how ship classes emerge — not through a class selector at creation, but through the physical constraints of the frame you fly.

### How Hulls Create Classes

A hull defines:
- **Slot layout** — how many of each slot type, and which special slots exist
- **Internal space** — total footprint budget
- **Hull integrity** — how much damage it can take
- **Hull mass** — affects jump power cost. Heavier hulls cost more per lightyear to move. A combat frame is expensive to reposition; a scout goes anywhere cheap.
- **Hull signature** — base EM emission multiplier. Bigger, more armored hulls radiate more just by existing. Feeds directly into the DSP detection chain. A combat hull sitting idle is louder than a scout sitting idle.
- **Special capabilities** — things only this hull can do (cloak, dual sensors, weapon hardpoints)
- **Hull-specific modifiers** — multipliers that change how specific systems perform (e.g., weapon draw reduction, scan speed bonus)

A "scout" isn't someone who picked scout components from a menu. It's someone flying a hull with a cloak slot, tight internals, and a speed bonus. They fill it with whatever components fit their playstyle, but the hull defines what's possible.

### Planned Hull Types

```
SCOUT HULL
├── Component Slots
│   ├── Warp Core      (1 slot)
│   ├── Drive          (1 slot)
│   ├── Sensors        (1 slot)
│   ├── Shields        (1 slot)
│   ├── Nav Computer   (tier 1-5)
│   ├── Cloak Module   (1 slot — scout-only)
│   └── Equipment      (2 slots)
│
├── Base Stats
│   ├── Hull Integrity: 75
│   ├── Total Internal Space: 250 m³
│   ├── Hull Mass: 0.7× (lightest frame, cheapest jumps)
│   └── Hull Signature: 0.6× (low-observable hull geometry)
│
├── Hull Bonus
│   ├── Jump Amplitude: +15% (goes further per jump)
│   ├── Spool Time: -30% (escapes faster — DR-705 spools in ~1.4 min vs 2 min)
│   └── Cooldown Time: -30% (arrives quieter — less time radiating at destination)
│
└── Character
    ├── Light, fast, fragile — the entire envelope is compressed
    ├── Arrives quiet (short cooldown), leaves fast (short spool)
    ├── 0.6× signature means harder to detect while in-system
    ├── Less equipment capacity — specialist, not generalist
    └── "First in, first out, nobody knew you were there."

SURVEYOR HULL
├── Component Slots
│   ├── Warp Core      (1 slot)
│   ├── Drive          (1 slot)
│   ├── Sensors        (2 slots — surveyor-only, dual array)
│   ├── Shields        (1 slot)
│   ├── Nav Computer   (tier 1-5)
│   └── Equipment      (4 slots)
│
├── Base Stats
│   ├── Hull Integrity: 100
│   ├── Total Internal Space: 325 m³
│   └── Survey Bonus: +20% scan speed
│
└── Character
    ├── Built for thorough exploration
    ├── Dual sensor slots — run a DSC + ACU simultaneously
    ├── Generous equipment capacity for mining/deployment
    └── "The scout found the system. I found everything in it."

STRIKER HULL (first combat hull)
├── Component Slots
│   ├── Warp Core      (1 slot)
│   ├── Drive          (1 slot)
│   ├── Sensors        (1 slot)
│   ├── Shields        (1 slot)
│   ├── Nav Computer   (tier 1-5)
│   └── Equipment      (2 slots)
│
├── Base Stats
│   ├── Hull Integrity: 75
│   ├── Total Internal Space: 200 m³
│   ├── Hull Mass: 0.9× (light frame, cheap jumps)
│   └── Hull Signature: 1.3× (combat frame runs hotter)
│
├── Hull Bonus
│   └── Weapon Draw: 0.6× (40% reduced power cost for weapons)
│
└── Character
    ├── Glass cannon — fragile, efficient, lethal
    ├── The weapon draw bonus makes dual phasers viable
    ├── Any hull can slot a weapon; only the Striker can afford two
    ├── No dedicated weapon mounts — weapons use equipment slots
    ├── Same integrity as a scout, less space than a Pioneer
    └── "Hit hard, hit first, don't get hit back."

SPECTER HULL (covert combat hull)
├── Component Slots
│   ├── Warp Core      (1 slot)
│   ├── Drive          (1 slot)
│   ├── Sensors        (1 slot)
│   ├── Shields        (1 slot)
│   ├── Nav Computer   (tier 1-5)
│   └── Equipment      (2 slots)
│
├── Base Stats
│   ├── Hull Integrity: 60
│   ├── Total Internal Space: 200 m³
│   ├── Hull Mass: 0.8× (ultralight frame)
│   └── Hull Signature: 0.5× (stealth-optimized hull geometry)
│
├── Hull Bonus
│   └── Stealth Systems Draw: 0.5× (halved power cost for cloak + torpedoes)
│
├── Hull Constraint
│   └── Shields offline while Veil Array is active (field geometry incompatible)
│
└── Character
    ├── The submarine — cloaked, patient, zero defense
    ├── Stealth draw bonus makes cloak + torpedo launcher viable
    ├── Cloak base draw (0.40) is crippling on other hulls
    ├── Shields go dark while cloaked — 60 integrity is all you have
    ├── Phasers + cloak is self-defeating (continuous emission negates stealth)
    ├── 4 torpedoes eat 80 m³ cargo — nearly single-purpose when armed
    └── "They never saw it coming. If they had, it would have been over."

BULWARK HULL (freighter)
├── Component Slots
│   ├── Warp Core      (1 slot)
│   ├── Drive          (1 slot)
│   ├── Sensors        (1 slot)
│   ├── Shields        (1 slot)
│   ├── Nav Computer   (tier 1-5)
│   └── Equipment      (1 slot)
│
├── Base Stats
│   ├── Hull Integrity: 150
│   ├── Total Internal Space: 600 m³
│   ├── Hull Mass: 1.4× (heavy frame, expensive jumps)
│   └── Hull Signature: 1.4× (big, visible, a target)
│
├── Hull Bonus
│   └── Cargo Efficiency: Cargo Expanders grant 75 m³ instead of 50 m³
│
└── Character
    ├── All cargo, no versatility
    ├── 1 equipment slot — pick ONE thing: defense, mining, or cargo expansion
    ├── 150 integrity means you survive a hit that would kill a Striker
    ├── But 1.4× mass and signature means everyone sees you coming
    ├── The backbone of the economy, the primary piracy target
    └── "Slow, fat, and full of someone else's money."

HEAVY COMBAT HULL (future — Mk II hull generation)
├── Component Slots
│   ├── Warp Core      (1 slot — or 2 slots)
│   ├── Drive          (1 slot)
│   ├── Sensors        (1 slot)
│   ├── Shields        (2 slots — layered defense)
│   ├── Nav Computer   (tier 1-5)
│   ├── Weapon Mounts  (2-3 dedicated slots)
│   └── Equipment      (2 slots)
│
├── Base Stats
│   ├── Hull Integrity: 200
│   ├── Total Internal Space: 350 m³
│   ├── Hull Mass: 1.5× (expensive to move)
│   └── Hull Signature: 1.8× (loud and proud)
│
├── Hull Bonus
│   └── Armor: +10% flat damage reduction
│
└── Character
    ├── Heavy, durable, dangerous — the opposite of the Striker
    ├── Dedicated weapon mounts that don't eat equipment slots
    ├── Dual shields for sustained engagements
    ├── Terrible at getting anywhere, terrifying once it arrives
    └── "The only ship that wants to find trouble."
```

The Pioneer remains the starting hull for all players. Hull upgrades are a significant mid-game milestone — acquiring a specialized hull means committing to a role, at least until you refit.

### Hull Properties

All hulls share the same stat axes. The values create the identity.

| Hull | Integrity | Space | Mass | Signature | Equipment | Bonus |
|------|-----------|-------|------|-----------|-----------|-------|
| Pioneer | 100 | 300 m³ | 1.0× | 1.0× | 3 | — |
| Scout | 75 | 250 m³ | 0.7× | 0.6× | 2 | +15% amplitude, -30% spool/cooldown |
| Surveyor | 100 | 325 m³ | 1.1× | 1.2× | 4 | Dual sensor slots, +20% scan speed |
| Bulwark | 150 | 600 m³ | 1.4× | 1.4× | 1 | Cargo Expanders grant 75 m³ |
| Striker | 75 | 200 m³ | 0.9× | 1.3× | 2 | 0.6× weapon draw |
| Specter | 60 | 200 m³ | 0.8× | 0.5× | 2 | 0.5× stealth systems draw (cloak + torpedoes) |

**Mass** multiplies jump power cost per lightyear. The scout goes everywhere cheap. The Striker is light for a combat frame but still costs more than a civilian hull would once the heavy combat hull arrives at 1.5×.

**Signature** multiplies base idle emission. Feeds into the DSP detection chain. The scout is hard to find just by existing. The Striker's combat-grade power routing makes it louder at rest — you can't hide a warship as easily as a cargo hauler.

### Hulls and Power Budget

The power budget is what makes hull choice matter. Every hull can slot the same components, but not every hull can *run* them.

The Striker's weapon draw bonus (0.6×) is the defining example. Any Pioneer pilot can install a phaser — but two phasers at 0.35 draw each adds 0.70 to total draw, cratering perfRatio to ~0.74. The Striker pays only 0.42 for the same two phasers. That 0.28 difference is the gap between a functional warship and a floating wreck that can barely jump.

Hull bonuses don't add new mechanics — they shift the power math enough to make loadouts viable that would be impractical otherwise. The Surveyor's scan speed bonus means it can run a power-hungry DSC array without losing all its time to scan duration. The Scout's jump amplitude bonus means a cheap Epoch-E core still gets decent range.

Future heavy combat hulls will push this further — dual shield slots, dedicated weapon mounts, possibly dual cores. Two Epoch-E cores give enormous output but eat 40 m³ of space. Two Epoch-R cores give frightening power but burn through core life at an alarming rate. The hull enables the choice; the physics constrain it.

## Ship Visualization

The ship is not a 3D model flying through space. You are *inside* the ship. Your understanding of it comes from the ShipLink UI — readouts, graphs, diagrams, status indicators.

The ship is represented as an **LCARS schematic** — an SVG diagram showing the hull layout with labeled bays for each module slot. Each bay shows what's installed, its status, power draw, and condition. Upgrading a component means swapping a module in the diagram. The ship isn't a thing you look at from outside; it's a system you read from within.

```
SHIP SCHEMATIC (conceptual)
┌─────────────────────────────────────────────┐
│                PIONEER FRAME                 │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ CORE     │  │ DRIVE    │  │ SENSORS  │  │
│  │ Epoch-S  │  │ DR-505   │  │ VRS Mk I │  │
│  │ 25 m³    │  │ 30 m³    │  │ 25 m³    │  │
│  │ ■■■■■■□□ │  │ ■■■■■□□□ │  │ ■■■■■■■□ │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  ┌──────────┐  ┌──────────┐                 │
│  │ SHIELDS  │  │ NAV      │                 │
│  │ Aegis δ  │  │ Tier 3   │                 │
│  │ 20 m³    │  │ 0 m³     │                 │
│  │ ■■■■■■□□ │  │ ■■■■■■□□ │                 │
│  └──────────┘  └──────────┘                 │
│                                              │
│  EQUIPMENT                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Mining   │  │ Platform │  │ Repair   │  │
│  │ Laser    │  │ Deployer │  │ Module   │  │
│  │ 10 m³    │  │ 25 m³    │  │ 15 m³    │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  INTERNAL SPACE: 150/300 m³ used             │
│  CARGO CAPACITY: 150 m³                      │
│  POWER BUDGET:   0.85 output / 1.0 draw      │
└─────────────────────────────────────────────┘
```

Different hull types have different schematic layouts. A combat hull shows weapon mounts and dual shield bays. A scout hull shows the cloak module. The diagram *is* the ship's identity — players recognize hull types by their schematic shape, not by a model rotating in 3D space.
