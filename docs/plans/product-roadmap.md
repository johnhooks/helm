# Product Roadmap

A long-term strategy for ship component evolution in Helm. This is a compass, not a GPS route — the direction is clear, the specifics emerge from gameplay.

## Principles

**Products are content.** Other games ship expansion packs. Helm ships products. A firmware update is a patch note from Epoch Labs. A new mark is a product launch event. A crossover product is a manufacturer making headlines. The release cadence *is* the game's content engine.

**Options, not obsolescence.** New products don't replace old ones. A Mk I v3 sensor with 10,000 usage is worth more than a fresh Mk II. New releases add choices to the landscape — they don't invalidate what players already have.

**Keep the meta moving.** The "best build" should shift periodically. Not violently — nobody's loadout becomes garbage. But the calculus changes. A firmware update makes a previously mediocre pairing viable. A new archetype opens a niche nobody was filling.

**Reward attention without punishing absence.** Firmware updates improve existing hardware at next refit. New marks are options, not requirements. A pilot who steps away for a month returns to more choices, not a power gap.

**Manufacturer stories.** Each release is a lore beat. Epoch Labs pushing firmware is different from DSC dropping a crossover shield. Products are events in a fictional industrial world that players participate in.

## Current State: Mk I v1

Nine core products across five component types, one hull.

### Cores (Epoch Labs)
| Product | Identity | HP | Regen | Output | Jump Cost | Footprint |
|---------|----------|----|-------|--------|-----------|-----------|
| Epoch-E | Patient, enduring | 1000 | 5/hr | 0.9x | 0.75x | 20 m³ |
| Epoch-S | Balanced, reliable | 750 | 10/hr | 1.0x | 1.0x | 25 m³ |
| Epoch-R | Aggressive, short-lived | 500 | 20/hr | 1.1x | 1.5x | 35 m³ |

### Drives (DR-Series Propulsion)
| Product | Identity | Range | Speed | Consumption | Footprint |
|---------|----------|-------|-------|-------------|-----------|
| DR-305 | Slow, efficient, long range | 10 ly | 0.5x | 0.6x | 20 m³ |
| DR-505 | Balanced | 7 ly | 1.0x | 1.0x | 30 m³ |
| DR-705 | Fast, hungry, short range | 5 ly | 2.0x | 1.5x | 45 m³ |

### Sensors (DSC / VRS / ACU)
| Product | Identity | Range | Chance | Survey Mult | Footprint |
|---------|----------|-------|--------|-------------|-----------|
| DSC Mk I | Sees far, surveys slow | 7 ly | 0.60 | 2.0x | 40 m³ |
| VRS Mk I | Good enough at both | 5 ly | 0.70 | 1.0x | 25 m³ |
| ACU Mk I | Short range, fast, accurate | 3 ly | 0.85 | 0.5x | 15 m³ |

### Shields (Aegis Foundry)
| Product | Identity | Capacity | Regen | Footprint |
|---------|----------|----------|-------|-----------|
| Aegis Alpha | Fast recovery, light | 50 | 20/hr | 10 m³ |
| Aegis Beta | Balanced coverage | 100 | 10/hr | 20 m³ |
| Aegis Gamma | Heavy absorption, slow | 200 | 5/hr | 35 m³ |

### Nav Computers
| Product | Skill | Efficiency |
|---------|-------|------------|
| Tier 1–5 | 0.3 → 0.9 | 0.5 → 1.0 |

Linear progression. No manufacturer identity. No tradeoffs. (Revisit at Mk II?)

### Hulls
| Hull | Space | Integrity | Equip Slots | Notes |
|------|-------|-----------|-------------|-------|
| Pioneer | 300 m³ | 100 | 3 | The only hull. Generalist. |

## Version Grammar

Within a mark, firmware versions soften weaknesses while preserving archetype identity. Strong stats nudge up slightly. Weak stats improve more noticeably. Footprint stays constant.

```
v1:  Baseline. Sharp tradeoffs. Players learn the system by feeling the edges.
v2:  Weakness softens. Strength nudges. "We heard your field reports."
v3:  Mk ceiling. Still has identity, less punishing. The mature product.
```

Example shape (not final numbers):

```
DSC Mk I sensor across versions:
         range    survey_mult    chance    footprint
v1:      7.0      2.0x           0.60      40 m³
v2:      ~7.3     ~1.7x          ~0.63     40 m³
v3:      ~7.5     ~1.5x          ~0.65     40 m³
```

The DSC is still "sees far, surveys slow" at v3. But the survey penalty dropped from 2.0x to 1.5x. A DSC at v3 is a meaningfully nicer experience than v1 without losing its character.

### Version Release Pattern

Staggered by manufacturer, not simultaneous. The order reflects personality:

1. **Epoch Labs** — conservative, methodical, well-funded. First to ship.
2. **VRS** — generalists, always keeping pace.
3. **Aegis** — military thoroughness. Tests extensively before release.
4. **DR-Series / ACU** — different reasons for the delay (small team / perfectionist).
5. **DSC** — frontier company, small operation, too busy building antennas.

Each firmware drop is a small content event. The meta shifts slightly with each one. By the time all v2s are out, the landscape has evolved. The power ratio problem on scout builds eases. The DSC becomes less punishing to survey with.

## Phase Map

These are sequential phases, not calendar dates. Each phase might span weeks or months of real time. The pacing comes from watching players use the system.

### Phase 1 — The Pioneer Age
**Products:** Mk I v1 across the board.
**Hulls:** Pioneer only.
**What happens:** Players explore near Sol. They discover tradeoffs through real consequences. The community forms opinions. The meta is simple and legible. This is the learning phase.

### Phase 2 — First Firmware Wave
**Products:** Mk I v2, staggered by manufacturer.
**Hulls:** Pioneer only.
**What happens:** Each manufacturer drops v2 on their own schedule. Each drop shifts the meta slightly. By the end, the landscape is softer. Scout builds become less painful. Surveyors get a bit more reach. The game feels like it's being actively developed by fictional companies.

### Phase 3 — Hull Introduction
**Products:** Mk I v2 everywhere, v3 starting to roll out.
**Hulls:** Scout and Surveyor join Pioneer.
**What happens:** The first structural change. Pilots who've been flying Pioneers for months now choose: stay generalist, or commit to a role. Hull choice matters because of special slots (cloak, dual sensors) and different space/integrity budgets, not because of component stats. Component stats are hull-agnostic.

This should happen *after* firmware maturity so pilots understand the component landscape before choosing a specialized frame.

### Phase 4 — Mature Mk I
**Products:** Mk I v3 across all manufacturers.
**Hulls:** Pioneer, Scout, Surveyor.
**What happens:** The Mk I line is at its ceiling. Products feel polished. The meta is well-understood. Players have worn-in components with real usage buffs. The game risks feeling solved. Which is exactly when...

### Phase 5 — Mk II Hardware
**Products:** Mk II v1 begins appearing alongside mature Mk I.
**Hulls:** Pioneer, Scout, Surveyor.
**What happens:** New physical products. Must be manufactured or purchased — not a firmware update. Three things arrive:

1. **Improved existing archetypes.** Same identity, higher baseline. The tradeoff curve is the same shape as Mk I v3 but shifted up.
2. **New archetypes.** A fourth option in some categories. Fills niches players have been asking for.
3. **Crossover products.** Manufacturers release components outside their domain. Objectively worse on standard metrics, but carrying a mechanical property from the home domain that native products can't have.

Mk II starts its own version cycle (v1 → v2 → v3). The Mk I line remains available — it's cheaper, well-understood, and high-usage Mk I components still outperform fresh Mk II in practice.

### Phase 6+ — The Long Game
The grammar repeats. Mk II firmware versions roll out. More crossover products appear. Maybe a new manufacturer enters the market. Mk III appears on the distant horizon. Each phase follows the same pattern: **new products create options, firmware versions tune the meta, manufacturer stories give releases narrative weight.**

The ecosystem deepens over years. No two ships feel the same — not because of combinatorial explosion, but because each component carries its own history, firmware, and wear.

## Open Questions

Decisions we'll make when gameplay teaches us the answers.

### Version count per mark
Currently assuming 3 (v1/v2/v3). Could be 2 or 4. Depends on how much tuning room we need and how often we want to ship content events.

### Surveyor hull cost
The current data gives Surveyor 325 m³, same integrity as Pioneer, same equipment slots, plus dual sensors and a survey bonus. That's strictly better. What does the Surveyor sacrifice? Candidates: slower base speed, higher refit cost, higher minimum power draw from dual array, reduced jump range.

### Nav computer evolution
Five tiers of pure linear progression with no manufacturer identity and zero footprint feels like it belongs to a different system than everything else. Options: leave it as-is (a pure progression track), or introduce manufacturer differentiation at Mk II (an Epoch nav that improves jump efficiency, a DSC nav that extends route planning range).

### Crossover mechanics
Crossover products introduce conditional effects ("shields regen during jumps", "scans draw core life instead of power") that the current formula system can't model. Do we extend the workbench formulas to handle these, or accept that crossovers are evaluated qualitatively?

### New archetypes at Mk II
What niches are missing? The docs mention a MIL military sensor array. What about drives, cores, shields? This depends entirely on what gameplay reveals as gaps.

### The scout power problem
The "obvious" scout build (Epoch-R + DR-705) runs a 0.73 power ratio at v1. Is this intentional (scouts must compromise) or a gap that firmware versions should close? By v3, the DR-705 consumption might drop enough to hit 0.85+. Or maybe that tension is the whole point.

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

When we add v2/v3 product data, the workbench becomes the verification layer — run the matrix, check that the version grammar holds, confirm that archetype identities survive the tuning.
