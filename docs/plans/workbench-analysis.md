# Workbench Analysis Playbook

How to use the workbench CLI to test and validate game mechanics. For formula definitions, see `docs/plans/ship-physics.md`.

## Purpose

The workbench proves formulas produce sane, balanced numbers before they touch the game server. It operates on static product data and pure functions — no WordPress, no database, no time simulation.

**What it can validate:**
- Formula correctness (strain, comfort range, costs, durations)
- Component differentiation (no two products are equivalent)
- Power budget constraints (jump/scan costs vs capacitor)
- Tuning isolation (throttle only affects jumps, etc.)
- Edge cases (underpowered combos, extreme tuning)
- Core lifecycle (jumps before death)

**What it can't validate (yet):**
- Time-based simulation (recharge timing, action sequencing)
- Multi-action sequences (jump then scan then wait)
- Experience curves and condition modifiers
- Equipment draw and system contention (perfRatio from runtime draw)

## Quick Start

```bash
# Single loadout report
bun run wb report
bun run wb report --core=epoch_r --throttle=2.0

# Compare two loadouts
bun run wb compare --a.core=epoch_e --b.core=epoch_r

# Sweep all combinations for a slot
bun run wb matrix --vary=core,drive

# Run the full analysis battery (71 scenarios across 12 categories)
bun run wb analyse
bun run wb analyse > resources/workbench/data/scenarios/analysis.json
```

All commands output JSON. Pipe through `jq` for exploration:

```bash
# Extract just power and jump from a report
bun run wb report | jq '{power: .report.power, jump: .report.jump}'

# Get all perfRatios from a core×drive matrix
bun run wb matrix --vary=core,drive | jq 'map({core: .loadout.core, drive: .loadout.drive, perfRatio: .report.power.perfRatio})'

# Pull a specific category from the analysis
bun run wb analyse | jq '.categories[] | select(.category == "Core Lifecycle")'
```

## The `analyse` Command

`bun run wb analyse` runs every scenario documented below and outputs a single JSON structure:

```json
{
  "generated": "2026-02-26",
  "defaults": { "loadout": {...}, "tuning": {...}, "constants": {...} },
  "categories": [
    {
      "category": "Baseline",
      "description": "...",
      "scenarios": [
        {
          "name": "Reference ship",
          "description": "...",
          "input": { "loadout": {...}, "tuning": {...} },
          "output": { /* full ShipReport */ }
        }
      ]
    }
  ]
}
```

Each scenario captures both input (what was configured) and output (what the formulas produced). This is the game's mechanical truth — when formulas or data change, regenerate and diff to see what moved.

### Categories

| Category | Scenarios | What It Tests |
|----------|-----------|---------------|
| Baseline | 1 | Reference ship — the number everything is measured against |
| Tuning Isolation | 4 | Each tuning param only affects its own system |
| Throttle Sweep | 4 | Jump metrics at 0.5/1.0/1.5/2.0 |
| Effort Sweep | 4 | Scan metrics at 0.5/1.0/1.5/2.0 |
| Priority Sweep | 4 | Shield metrics at 0.5/1.0/1.5/2.0 |
| Power Budget | 4 | Ship-physics Section 4 constraints |
| Core x Drive Matrix | 9 | All core×drive combos: perfRatio, comfort, costs |
| Sensor Matrix | 3 | All sensors: comfort, chance, duration |
| Shield x Priority | 9 | All shields × priority 0.5/1.0/2.0 |
| Core Lifecycle | 18 | Jumps before core death at throttle 1.0 and 0.5 |
| Hull Comparison | 4 | All hulls: cargo, power budget, shield budget |
| Edge Cases | 7 | Worst perfRatio, max draw, extreme loadouts |

### Saving and Diffing

The saved analysis lives at `resources/workbench/data/scenarios/analysis.json`. To check for regressions after a formula or data change:

```bash
# Regenerate
bun run wb analyse > /tmp/new-analysis.json

# Diff against saved baseline
diff <(jq 'del(.generated)' resources/workbench/data/scenarios/analysis.json) \
     <(jq 'del(.generated)' /tmp/new-analysis.json)

# Or use jq to compare specific categories
diff <(jq '.categories[] | select(.category == "Baseline")' resources/workbench/data/scenarios/analysis.json) \
     <(jq '.categories[] | select(.category == "Baseline")' /tmp/new-analysis.json)
```

## Analysis Checklist

Validate these whenever formulas or product data change:

1. **Baseline sanity** — Default report has no zeros, NaN, or Infinity in expected fields. All comfort ranges > 0. All chances between 0 and 1.

2. **Tuning isolation** — Changing throttle doesn't affect scan or shield output. Changing effort doesn't affect jump or shield. Changing priority doesn't affect jump or scan. Use the Tuning Isolation category to verify.

3. **Tuning scaling** — Throttle 2.0 produces exactly half the jump duration vs 1.0. Effort 2.0 produces exactly double scan duration. Priority 2.0 produces exactly double shield regen and draw.

4. **Limp home** — Throttle ≤ 0.5 produces zero core cost across all 9 core×drive combos. Core Lifecycle category verifies this.

5. **Effort cap** — Effort never pushes scan chance above the sensor's base chance, even within comfort range. Check `min(base, (base/strain)*effort)` at effort=2.0.

6. **Power budget** — Validate against ship-physics Section 4:
   - Comfort-range jump costs 50-70% of capacitor
   - Comfort-range scan costs a small fraction (shouldn't deplete)
   - Jump + scan combined exceeds capacitor (forces sequencing)
   - Shield draw at priority 1.0 is below core regen rate

7. **Strain progression** — At distance/comfort ratios of 1.0×/1.5×/2.0×/3.0×, strain values should be 1.0/1.25/2.0/5.0. Check sampleJumps and sampleScans.

8. **perfRatio cascade** — Underpowered combos (DR-705 + Epoch-E: perfRatio=0.6) degrade comfort range and amplitude proportionally. DR-705 + Epoch-E comfort should be `5.0 * 0.9 * 0.6 = 2.7ly`.

9. **Component differentiation** — Each product in a slot has a meaningfully different profile. No two cores/drives/sensors/shields should produce identical reports. Use matrix commands to verify.

10. **Draw headroom** — Shield draw at max priority doesn't exceed capacitor for any hull. Aegis Gamma at priority 3.0 draws 24 — well under any hull's capacitor.

## How to Read the Numbers

### Reference Values (Default Loadout, Pioneer Hull)

| Metric | Expected | Rationale |
|--------|----------|-----------|
| Jump comfort range | 7 ly | DR-505 sustain(7) × output(1.0) × perfRatio(1.0) |
| Scan comfort range | 5 ly | VRS sustain(5) × output(1.0) |
| Jump power (comfort) | 40-56 | 50-70% of 100 capacitor |
| Scan power (comfort) | ~10 | Low enough to not deplete |
| Jump + scan combined | > 50 | Forces sequencing decisions |
| Shield draw (pri 1.0) | 5 | Well below regen rate of 10/hr |
| Core lifecycle | 150 jumps | Epoch-S 750hp / (5ly × 1.0 × 1.0) at 5ly |

### What "Good" Looks Like

- **Comfort range**: Where linear costs apply. Should be 3-10 ly depending on component.
- **perfRatio**: 1.0 = core output meets drive demand. < 1.0 = underpowered. The DR-705 on Epoch-S/E is intentionally underpowered (~0.67/0.6).
- **Strain at 2× comfort**: Should be exactly 2.0. Doubles all costs, halves chance.
- **Core lifecycle**: Default loadout should sustain 100+ comfort-range jumps. Economy builds (Epoch-E + DR-305) should reach 400+.

### Red Flags

- perfRatio = 0 or Infinity
- Comfort range = 0 (no sustain or output)
- Chance > base (effort cap violated)
- Core cost > 0 at throttle ≤ 0.5 (limp-home violated)
- Shield timeToFull = Infinity (regen rate = 0)
- Negative values anywhere

## Investigating a Problem

When a number looks wrong:

1. **Isolate with a single report.** Run `bun run wb report` with the specific loadout and tuning that produces the problem. Check the full output.

2. **Compare against baseline.** Use `bun run wb compare` to see the delta between the problem loadout and the default. The delta object shows exactly which metrics changed and by how much.

3. **Trace the formula chain.** Every output value traces back through a chain:
   - `comfortRange` ← sustain × coreOutput × perfRatio (jumps) or sustain × coreOutput (scans)
   - `perfRatio` ← min(1, coreOutput / drive.mult_b)
   - `coreOutput` ← core.mult_a
   - `strain` ← 1 + ((distance/comfort) - 1)² when past comfort
   - `coreCost` ← distance × core.mult_b × drive.mult_b × throttle × strain
   - `powerCost` ← distance × basePerLy × strain
   - `chance` ← min(base, (base/strain) × effort)
   - `duration` ← ceil(distance × baseSeconds / (amplitude × throttle)) for jumps
   - `duration` ← ceil(distance × baseSeconds × sensor.mult_a × effort) for scans

4. **Check the product data.** The raw data lives in `resources/workbench/data/products/`. Verify the field you're tracing has the expected value.

5. **Matrix sweep.** If the problem is a specific component, run `bun run wb matrix --vary=<slot>` to see all alternatives side by side. If all products in a slot show the same problem, the formula is likely wrong. If only one does, the data is likely wrong.
