# Product Roadmap

A long-term strategy for ship component evolution in Helm. This is a compass, not a GPS route — the direction is clear, the specifics emerge from gameplay.

## Principles

**Products are content.** Other games ship expansion packs. Helm ships products. A new mark is a product launch event. A crossover product is a manufacturer making headlines. A balance-driven version change is a retooled production line with economic ripples. The release cadence _is_ the game's content engine.

**Options, not obsolescence.** New products don't replace old ones. A Mk I sensor with 10,000 usage is worth more than a fresh Mk II. New releases add choices to the landscape — they don't invalidate what players already have.

**Balance creates scarcity.** When a product is too strong, the manufacturer releases a new version with the nerf. The old version stops manufacturing but persists in the economy. Players who own it keep it. The market prices it. History isn't erased — it becomes collectible.

**Reward attention without punishing absence.** New marks are options, not requirements. A pilot who steps away for a month returns to more choices, not a power gap. Their existing gear is exactly as they left it.

**Manufacturer stories.** Each release is a lore beat. Epoch Labs retooling a core line is different from DSC dropping a crossover shield. Products are events in a fictional industrial world that players participate in.

## Current State: Mk I v1

Nine core products across five component types, one hull.

### Cores (Epoch Labs)

| Product | Identity                | HP   | Regen | Output | Jump Cost | Footprint |
| ------- | ----------------------- | ---- | ----- | ------ | --------- | --------- |
| Epoch-E | Patient, enduring       | 1000 | 5/hr  | 0.9x   | 0.75x     | 20 m³     |
| Epoch-S | Balanced, reliable      | 750  | 10/hr | 1.0x   | 1.0x      | 25 m³     |
| Epoch-R | Aggressive, short-lived | 500  | 20/hr | 1.1x   | 1.5x      | 35 m³     |

### Drives (DR-Series Propulsion)

| Product | Identity                    | Range | Speed | Consumption | Footprint |
| ------- | --------------------------- | ----- | ----- | ----------- | --------- |
| DR-305  | Slow, efficient, long range | 10 ly | 0.5x  | 0.6x        | 20 m³     |
| DR-505  | Balanced                    | 7 ly  | 1.0x  | 1.0x        | 30 m³     |
| DR-705  | Fast, hungry, short range   | 5 ly  | 2.0x  | 1.5x        | 45 m³     |

### Sensors (DSC / VRS / ACU)

| Product  | Identity                    | Range | Chance | Survey Mult | Footprint |
| -------- | --------------------------- | ----- | ------ | ----------- | --------- |
| DSC Mk I | Sees far, surveys slow      | 7 ly  | 0.60   | 2.0x        | 40 m³     |
| VRS Mk I | Good enough at both         | 5 ly  | 0.70   | 1.0x        | 25 m³     |
| ACU Mk I | Short range, fast, accurate | 3 ly  | 0.85   | 0.5x        | 15 m³     |

### Shields (Aegis Foundry)

| Product     | Identity               | Capacity | Regen | Footprint |
| ----------- | ---------------------- | -------- | ----- | --------- |
| Aegis Alpha | Fast recovery, light   | 50       | 20/hr | 10 m³     |
| Aegis Delta | Balanced coverage      | 100      | 10/hr | 20 m³     |
| Aegis Eta   | Heavy absorption, slow | 200      | 5/hr  | 35 m³     |

### Nav Computers

| Product  | Skill     | Efficiency |
| -------- | --------- | ---------- |
| Tier 1–5 | 0.3 → 0.9 | 0.5 → 1.0  |

Linear progression. No manufacturer identity. No tradeoffs. (Revisit at Mk II?)

### Hulls

| Hull    | Space  | Integrity | Equip Slots | Notes                      |
| ------- | ------ | --------- | ----------- | -------------------------- |
| Pioneer | 300 m³ | 100       | 3           | The only hull. Generalist. |

## Versions as Balance Patches

Versions are manufacturing runs, not firmware updates. A product ships as v1. It stays v1 forever — unless gameplay reveals a balance problem. Then the manufacturer retools the production line and releases v2. The v1 units already in the game stay exactly as they are.

There is no version grammar. No predictable v1→v2→v3 progression. A version change is whatever the balance fix requires — a stat nerf, a buff, an envelope rework, a tuning range adjustment. The delta between versions is driven by gameplay data, not a formula.

Most products may never need a v2. Some might need one quickly. The version number is a manufacturing history, not a progression track.

### What Happens When a Version Ships

1. The new version gets a `released_at` timestamp.
2. Stations and factories switch to producing the new version.
3. The old version stops manufacturing — no more units enter the economy.
4. Every existing unit of the old version remains as-is. Players can use, repair, buy, sell, and salvage them.
5. Over time, old versions become scarcer as units break down, get scrapped, or sit in wrecks.

### Economic Consequences

A version change is a market event:

-   **Nerfed product (v1 was strong):** v1 units become legacy hardware. Scarce, sought-after, priced accordingly. Collectors hoard them. The supply curve only goes down.
-   **Buffed product (v1 was weak):** v1 units become cheap junk. New players pick them up as beaters. Veterans dump their old stock.
-   **Reverted product (v3 closer to v1):** The collectors suddenly have competition. Price dynamics shift again.

This means balance changes aren't just mechanical — they're economic events with lore weight. "DR-Series retooled the 705 line" is news.

## Phase Map

These are sequential phases, not calendar dates. Each phase might span weeks or months of real time. The pacing comes from watching players use the system.

### Phase 1 — The Pioneer Age

**Products:** Mk I v1 across the board.
**Hulls:** Pioneer only.
**What happens:** Players explore near Sol. They discover tradeoffs through real consequences. The community forms opinions. The meta is simple and legible. This is the learning phase. Balance issues emerge — some are intentional tension, some are gaps. We watch.

### Phase 2 — First Balance Patches

**Products:** Mk I, with targeted version bumps where gameplay demands it.
**Hulls:** Pioneer only.
**What happens:** Not every product gets a v2. Only the ones where the data says something's off. Maybe the DR-705 is too punishing on core life. Maybe the DSC survey penalty is driving players away from long-range scanning. Each retooled product is a content event with economic consequences — the old units become legacy hardware.

### Phase 3 — Hull Introduction

**Products:** Mk I (some at v1, some at v2 where balanced).
**Hulls:** Scout and Surveyor join Pioneer.
**What happens:** The first structural change. Pilots who've been flying Pioneers for months now choose: stay generalist, or commit to a role. Hull choice matters because of special slots (cloak, dual sensors) and different space/integrity budgets, not because of component stats. Component stats are hull-agnostic.

This should happen after pilots understand the component landscape from real play.

### Phase 4 — Mk II Hardware

**Products:** Mk II v1 begins appearing alongside Mk I.
**Hulls:** Pioneer, Scout, Surveyor.
**What happens:** New physical products. Must be manufactured or purchased. Three things arrive:

1. **Improved existing archetypes.** Same identity, higher baseline. The tradeoff curve is the same shape but shifted up.
2. **New archetypes.** A fourth option in some categories. Fills niches players have been asking for.
3. **Crossover products.** Manufacturers release components outside their domain. Objectively worse on standard metrics, but carrying a mechanical property from the home domain that native products can't have.

The Mk I line remains available — it's cheaper, well-understood, and high-usage Mk I components still outperform fresh Mk II in practice.

### Phase 5+ — The Long Game

More marks. More crossover products. Maybe a new manufacturer enters the market. Version bumps happen when balance demands them — at any mark level. Each phase follows the same pattern: **new marks create options, version changes tune the meta through economic scarcity, manufacturer stories give releases narrative weight.**

The ecosystem deepens over years. No two ships feel the same — not because of combinatorial explosion, but because each component carries its own manufacturing run, usage history, and wear.

## Open Questions

Decisions we'll make when gameplay teaches us the answers.

### Version cadence

No fixed count per mark. Versions happen when balance demands it. Some products may stay at v1 forever. The question is how quickly we should act on balance data — too fast and the economy never settles, too slow and the meta stagnates.

### Surveyor hull cost

The current data gives Surveyor 325 m³, same integrity as Pioneer, same equipment slots, plus dual sensors and a survey bonus. That's strictly better. What does the Surveyor sacrifice? Candidates: slower base speed, higher refit cost, higher minimum power draw from dual array, reduced jump range.

### Nav computer evolution

Five tiers of pure linear progression with no manufacturer identity and zero footprint feels like it belongs to a different system than everything else. Options: leave it as-is (a pure progression track), or introduce manufacturer differentiation at Mk II (an Epoch nav that improves jump efficiency, a DSC nav that extends route planning range).

### Crossover mechanics

Crossover products introduce conditional effects ("shields regen during jumps", "scans draw core life instead of power") that the current formula system can't model. Do we extend the workbench formulas to handle these, or accept that crossovers are evaluated qualitatively?

### New archetypes at Mk II

What niches are missing? The docs mention a MIL military sensor array. What about drives, cores, shields? This depends entirely on what gameplay reveals as gaps.

### The scout power problem

The "obvious" scout build (Epoch-R + DR-705) runs a 0.73 power ratio at v1. Is this intentional (scouts must compromise) or a balance gap? If it's a gap, a v2 DR-705 with lower consumption could fix it — and the original v1 units with the higher consumption become legacy hardware that some pilots might prefer for the raw amplitude. Or maybe that tension is the whole point.

## Using the Workbench

The CLI workbench (`bun run wb`) is the primary tool for evaluating product data as we iterate on versions and marks. See `resources/workbench/README.md` for full usage.

Quick reference for roadmap work:

```bash
# See the current product landscape
bun run wb list product
bun run wb list products --type=core

# Evaluate a specific loadout
bun run wb report --core=epoch_r --drive=dr_705 --sensor=dsc_mk1

# Compare two builds side by side
bun run wb compare --a.core=epoch_e --b.core=epoch_r

# Sweep all combinations for a slot
bun run wb matrix --vary=core

# Rank all core+drive combos by jump range
bun run wb matrix --vary=core,drive 2>/dev/null \
  | jq '[.[] | {core: .loadout.core, drive: .loadout.drive,
    ratio: .report.power.perfRatio, jumpRange: .report.jump.maxRange,
    cargo: .report.footprint.cargo}] | sort_by(-.jumpRange)'
```

When considering a version bump, the workbench is the verification layer — model the proposed change, run the matrix, confirm that archetype identities survive the adjustment and the economic implications make sense.
