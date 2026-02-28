# Warp Core and Ship Power

## Overview

Ships are powered by a **warp core** - a finite resource that cannot be refueled, only replaced. The core provides two things:

1. **Jump capacity** - The ability to make warp jumps (permanent consumption)
2. **Power output** - Energy for ship operations (regenerating)

This creates a two-layer resource system with different planning horizons:
- **Strategic**: Core life determines ship mortality
- **Tactical**: Power availability determines operational tempo

## Core Life

The warp core has a finite lifespan measured in **light-years of jump capacity**. Each jump permanently consumes some of this capacity based on distance traveled.

When core life reaches zero:
- Ship cannot jump
- Ship becomes a **derelict** (salvageable by others)
- Core must be replaced to restore function

### Core Replacement

Cores cannot be "refueled" or "recharged." A depleted core must be fully replaced:
- Available at stations
- Expensive (major economic decision)
- Different core types available

### The Core Tradeoff

Cores have a fundamental tradeoff: **recharge rate vs. longevity**.

A "hot" core regenerates power quickly but burns out faster per jump. A "cold" core regenerates slowly but lasts longer. This creates meaningful player choice at purchase time, not moment-to-moment micromanagement.

## Epoch Series

The first generation of warp cores are the **Epoch series** from **Epoch Labs** — the company that grew out of the CERN Subspace Research Division. See `manufacturers.md` for their full history.

All three variants share the same base platform with different tuning. Epoch trusts the pilot to choose the tradeoff that matches their mission.

| Model | Type | Philosophy |
|-------|------|------------|
| **Epoch-E** | Endurance | Conservative, reliable. *"She'll outlast us all."* |
| **Epoch-S** | Standard | Balanced, sensible. *"The workhorse."* |
| **Epoch-R** | Rapid | Pushed to the limits. *"Running hot."* |

Same core, different tuning. The suffix tells you what the engineers optimized for.

### Specifications

| Model | Life (ly) | Regen/Hour | Jump Multiplier | Base Output |
|-------|-----------|------------|-----------------|-------------|
| Epoch-E | 1000 | 5 | 0.75x | 0.9x |
| Epoch-S | 750 | 10 | 1.0x | 1.0x |
| Epoch-R | 500 | 20 | 1.5x | 1.1x |

**Base Output** affects all systems that scale with core power - including drive range and sensor range. A cold Epoch-E core produces 90% output, reducing effective range but contributing to its conservative nature. A hot Epoch-R produces 110%, slightly extending capabilities at the cost of faster decay.

*Starting values, subject to balancing.*

### Example: Two Pilots

**Epoch-R Explorer**
- 500 ly total life, but jumps cost 1.5x
- After 333 ly of actual travel, core is depleted
- Can scan frequently (high regen)
- *"Running hot, scanning everything, burning through cores like fuel."*

**Epoch-E Trader**
- 1000 ly total life, jumps cost only 0.75x
- Can travel 1333 ly before core is depleted
- Must wait longer between scans (low regen)
- *"Slow and steady. She'll still be running when your Epoch-R is space junk."*

## Power System

### Power as Capacitor

The warp core continuously generates power, stored in a capacitor:
- **Capacity**: Maximum power (e.g., 100 units)
- **Current**: How much is available now (calculated, not stored)
- **Regeneration**: Units restored per hour (varies by core type)

Power regenerates over real time. The system stores **when power will be full**, not the current level. Current power is always calculated from this countdown. This means no polling, no ticks - just timestamps and math.

### Power Consumption

Operations consume power:

| Operation | Power Cost |
|-----------|------------|
| Scan | 10-20 (varies by distance) |
| Shield boost | 5-15 (future) |
| Emergency maneuver | 25 (future) |

When power is insufficient:
- Operation cannot start
- Must wait for regeneration
- Creates tactical pacing

### Power Does NOT Affect Core Life

Power regeneration is free - it does not consume core life. The tradeoff is:
- Hot cores regenerate power faster (operational advantage)
- Hot cores consume more core life per jump (strategic cost)

The penalty is paid at jump time, not during operations.

### No Management, Just Consequences

Power is not something players allocate or configure mid-flight. Ship configuration (what core you have, what systems are installed) determines capabilities. Players make decisions about *actions* ("Do I scan now or wait?"), not *settings* ("Allocate 40% to sensors").

Configuration happens at stations. In space, you use your ship as built.

## Display Behavior

When an operation is in progress, the UI shows power draining gradually over the operation's duration. When idle, power ticks back up toward full. This is purely visual - the accounting happens instantly when an operation starts, but the animation makes operations feel connected to ship state.

No server polling required. Frontend calculates display values from timestamps using the same math as the backend.

## Derelict Ships

When core life reaches zero:
- Ship is stranded (cannot jump)
- Marked as "derelict" in the system
- Visible to other ships scanning the area
- Can be salvaged for cargo, artifacts, hull, core fragments

The player must call for rescue, abandon ship, or wait to be salvaged.

## Gameplay Implications

### Strategic Decisions

- **Route planning**: Minimize total jump distance to preserve core
- **Core investment**: Expensive hot core for active play, cheap cold core for patience
- **Ship mortality**: All ships eventually die, creates attachment and loss
- **Salvage value**: Derelict ships may have cores with remaining life

### Tactical Decisions

- **Scan timing**: Wait for power or scan now?
- **Power budgeting**: Save power for emergency operations?
- **Operational tempo**: Hot cores enable aggressive play, cold cores reward patience

### Economic Connections

- Core replacement is a major expense
- Creates demand for credits
- Salvage economy: recovering cores from derelicts
- Station placement matters (where can you get a new core?)

## Future Considerations

### Core Upgrades

Could cores be upgraded rather than replaced?
- Efficiency modules
- Extended capacity modifications
- Tradeoffs maintained

### Core Damage

Could cores be damaged (not just depleted)?
- Combat damage
- Navigation failures
- Repair vs. replace decision

### Beyond Epoch

The Epoch Mk I line is the foundation, not the ceiling.

**Mark progression:**
- **Epoch Mk II** — Improved across the board. The E/S/R tradeoff persists but the weaknesses soften. An Epoch-E Mk II still regens slowly, but 7/hr instead of 5/hr. The identity stays; the penalty shrinks.
- **Epoch Mk III** — Endgame cores. Higher life, better regen, more output. The gap between E and R narrows — they're all genuinely good, just tuned differently.

**Firmware versions** within each mark refine the tuning. Epoch-S Mk I v2 might improve regen by 5% over v1. Small changes, released over time, keeping the meta fresh.

**New entrants:**
- **Next-generation labs** — Companies that didn't exist at launch. Different core architectures with tradeoffs Epoch never considered.
- **Crossover cores** — A sensor company builds a core that extends scan range while it's running. Bad output, great passive bonus. See `manufacturers.md`.
- **Salvaged technology** — Ancient/alien cores found in deep-space derelicts. Properties that don't follow normal physics. Rare, unreproducible, highly sought after.
