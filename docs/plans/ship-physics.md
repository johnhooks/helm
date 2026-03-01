# Ship Physics

The formula system that governs how ships behave. Every number a player sees — jump cost, scan chance, shield recovery, time to arrival — derives from these formulas operating over product data, component state, and pilot choices.

## Design Principles

1. **No hard caps.** Distance, range, and capability are constrained by economics, not arbitrary walls. A ship can always attempt more than its comfort zone — it just costs more.
2. **Every action is a commitment.** Jumping costs power and core life. Scanning costs power and time with uncertain odds. The pilot weighs cost against reward before every action.
3. **Components have character.** Two drives aren't just different numbers — they unlock different playstyles through unique tuning capabilities. Experience deepens that character over time.
4. **Power is the universal constraint.** Every system draws from the same pool. The interesting decisions come from contention: what are you willing to starve so something else can run?

---

## 1. Strain

The shared mechanic underlying all distance-based costs. Strain is a pure function of how far past a component's comfort zone you're pushing.

### Comfort Range

Each distance-based system has a **comfort range** — the distance at which costs are linear. Derived from the component's `sustain` value and ship state:

```
jumpComfortRange = drive.sustain × coreOutput × perfRatio
scanComfortRange = sensor.sustain × coreOutput
```

Fresh Mk I components with an Epoch-S core in default configuration produce comfort ranges near the baseline values:

| Component | sustain | Comfort Range |
|-----------|---------|---------------|
| DR-305    | 10.0    | 10.0 ly       |
| DR-505    | 7.0     | 7.0 ly        |
| DR-705    | 5.0     | ~3.3 ly *     |
| DSC Mk I  | 7.0     | 7.0 ly        |
| VRS Mk I  | 5.0     | 5.0 ly        |
| ACU Mk I  | 3.0     | 3.0 ly        |

\* DR-705 is underpowered on an Epoch-S (consumption 1.5 > output 1.0), so perfRatio = 0.67.

### Strain Factor

Beyond comfort range, strain increases quadratically:

```
strain(distance, comfortRange) =
  if distance ≤ comfortRange: 1.0
  else: 1 + ((distance / comfortRange) - 1) ^ 2
```

| distance / comfort | strain | practical meaning               |
|--------------------|--------|---------------------------------|
| ≤ 1.0×             | 1.00   | linear cost, full chance        |
| 1.25×              | 1.06   | barely noticeable               |
| 1.5×               | 1.25   | 25% surcharge                   |
| 2.0×               | 2.00   | double cost, half chance        |
| 3.0×               | 5.00   | emergency only                  |

### What Strain Affects

Strain multiplies **costs** and divides **probabilities**. It never affects speed or duration — a ship in transit moves at the same velocity regardless of strain. The penalty is economic, not physical.

| System | Strained                        | NOT strained          |
|--------|---------------------------------|-----------------------|
| Jump   | core life cost, power cost      | duration (speed)      |
| Scan   | power cost, success chance      | duration (sweep rate) |

---

## 2. Per-Action Tuning

Every action the pilot initiates has a tuning parameter — a slider that trades one resource for another. There is no global power mode. Each action is an independent commitment.

### Scan Effort (0.5–2.0, default 1.0)

Signal integration time. Higher effort = sensor dwells longer on each target.

```
scanChance   = (sensor.chance / strain) × effort       capped at sensor.chance
scanDuration = distance × baseScanSecondsPerLy × sensor.mult_a × effort
scanPowerCost = distance × baseScanPowerPerLy × strain
```

- **effort 0.5:** Half duration, half chance. Quick ping — did I miss something? Maybe. But I saved time and can scan again.
- **effort 1.0:** Baseline. Full rated chance within comfort, degraded past it.
- **effort 2.0:** Double duration, chance approaches base even past comfort. The careful, expensive scan.

Power cost is NOT affected by effort. You're using the sensor for the same purpose, just more or less carefully. The power cost reflects signal strength (distance + strain), not processing time.

### Jump Throttle (0.5–2.0, default 1.0)

How hard the drive pushes. Throttle affects both speed and core life cost.

```
jumpCoreCost  = distance × core.mult_b × drive.mult_b × throttle × strain
jumpPowerCost = distance × baseJumpPowerPerLy × strain
jumpDuration  = (distance × baseJumpSecondsPerLy) / (amplitude × throttle)
```

- **throttle 0.5:** Half speed, half core life cost. The economical cruise.
- **throttle 1.0:** Baseline. Rated speed and cost.
- **throttle 2.0:** Double speed, double core life cost. Burning hot.

Power cost is NOT affected by throttle. The drive draws the same power to initiate and sustain the jump regardless of how hard it pushes — throttle determines how efficiently that energy converts to speed and how much stress it puts on the core.

### Zero Core Life at Low Throttle

At throttle ≤ 0.5, core life cost drops to zero. The drive is barely working — generating just enough field to move, putting no stress on the core. This is the "limp home" setting: slow, but it won't kill your core. You still need power to jump.

### Shield Priority (0.5–2.0, default 1.0)

How aggressively shields regenerate, trading power draw for recovery speed.

```
shieldRegenRate = shield.rate × priority
shieldDraw      = shield.baseDraw × priority
```

- **priority 0.5:** Slow regen, minimal power draw. Shields recover in the background without starving other systems.
- **priority 2.0:** Fast regen, heavy power draw. Get shields up NOW at the cost of everything else.

### Remembered Preferences

The pilot's last-used setting per action type is saved in user preferences:

```
user_preferences: {
  scan_effort: 1.0,
  jump_throttle: 1.0,
  shield_priority: 1.0
}
```

The UI defaults to the saved preference. The pilot adjusts before confirming each action. No ship-wide mode column. The chosen setting is baked into the action record when created.

---

## 3. Product Specializations

Each product model unlocks a unique tuning capability that others in the same slot don't have. Stats define what a component *is*. The specialization defines what it *can do that nothing else can*.

### Sensors

```
DSC Mk I (long range, slow, low chance):
  Specialization: Deep Focus
  Effort range: 0.5–3.0 (standard max is 2.0)

  The DSC can push effort to 3.0 — triple integration time, massive
  chance recovery at long range. The sensor for when you absolutely
  need to find something out there and you're willing to wait for it.

VRS Mk I (balanced):
  Specialization: Rapid Sweep
  Effort range: 0.25–2.0 (standard min is 0.5)

  The VRS can drop effort to 0.25 — quick low-chance pings. Scan
  four times in the time a DSC scans once. The sensor for covering
  ground fast, trading reliability for throughput.

ACU Mk I (short range, fast, high chance):
  Specialization: Precision Lock
  Effort range: 0.5–2.0 (standard)
  At effort ≥ 1.5, chance cap lifts to 0.95 (others cap at base).

  The ACU finds what it's looking for. Short range but near-guaranteed
  results when pushed. The sensor for when you know something is
  nearby and need to lock it down.
```

### Drives

```
DR-305 Economy:
  Specialization: Ultra Cruise
  Throttle range: 0.2–2.0 (standard min is 0.5)

  Can cruise at throttle 0.2 — barely sipping core life, crawling
  through space. The drive for long expeditions into unmapped space
  where you can't replace your core.

DR-505 Standard:
  Specialization: Steady Field
  Throttle range: 0.5–2.0 (standard)
  Strain curve is gentler: exponent 1.5 instead of 2.0.

  The DR-505 doesn't push extremes — it handles overreach more
  gracefully than other drives. Same comfort range, but the cost
  escalation past it is less punishing. The drive for pilots who
  want to push a little past comfort without paying through the nose.

DR-705 Boost:
  Specialization: Overdrive Burst
  Throttle range: 0.5–3.0 (standard max is 2.0)

  Can push throttle to 3.0 — arriving in a third of the time,
  burning triple the core life. The drive for emergencies, combat
  positioning, and pilots who'd rather replace a core than wait.
```

### Shields

```
Aegis Alpha (high capacity, slow regen):
  Specialization: Fortress Mode
  Priority range: 0.25–2.0 (standard min is 0.5)
  At priority ≤ 0.5, shields draw almost no power — pure background
  recovery. The shield for ships that need capacity but can't spare
  power for fast regen.

Aegis Delta (balanced):
  Specialization: Adaptive Cycling
  Priority range: 0.5–2.0 (standard)
  Regen efficiency improves at priority 1.0 (10% bonus to rate).
  No extremes, no penalties — the reliable choice.

Aegis Eta (low capacity, fast regen):
  Specialization: Rapid Recovery
  Priority range: 0.5–3.0 (standard max is 2.0)
  Can push priority to 3.0 — shields come up fast at the cost of
  heavy power draw. The shield for combat-oriented ships that need
  to recover between engagements.
```

### How Specializations Are Expressed

Per-product tuning config in the product data:

```json
{
  "slug": "dr_705",
  "sustain": 5.0,
  "mult_a": 2.0,
  "mult_b": 1.5,
  "mult_c": 2.0,
  "tuning": {
    "param": "throttle",
    "min": 0.5,
    "max": 3.0
  }
}
```

The UI reads tuning bounds from the product and presents the appropriate slider range.

---

## 4. Power Economy

Power is the universal currency. Every system draws from the same capacitor, which recharges from the core.

### Power Capacitor

The ship has a power capacitor with a maximum capacity and a recharge rate:

```
rechargeRate = core.rate × coreOutput
```

Power recharges continuously. The timestamp-based model (`power_full_at`) computes current power from elapsed time. When a system draws power, `power_full_at` shifts forward.

### Action Power Costs

Jumps and scans have one-time power costs computed when the action is created:

```
jumpPowerCost = distance × baseJumpPowerPerLy × strain
scanPowerCost = distance × baseScanPowerPerLy × strain
```

The power is deducted when the action starts. If the ship doesn't have enough power, the action can't be initiated. The pilot must wait for recharge or reduce the action's scope.

### Continuous Power Draw

Some systems draw power continuously while active:

```
shieldDraw    = shield.baseDraw × priority    (while shields < max)
equipmentDraw = equipment.draw                (while running)
```

Continuous draw competes with recharge. If total continuous draw exceeds recharge rate, the capacitor drains over time. If it's less, the capacitor refills (just slower than with no draw).

### System Contention via perfRatio

When total continuous draw from all active systems exceeds core output, everything underperforms proportionally:

```
totalDraw = drive.draw + shield.draw + sensor.draw + equipment.draw + ...
perfRatio = min(1.0, coreOutput / totalDraw)
```

perfRatio feeds into comfort range and amplitude. When perfRatio < 1.0:
- Comfort range shrinks (less effective sustain)
- Jump amplitude drops (slower travel)
- Everything degrades equally — the pilot must choose what to turn off

### Tuning for Power Budget

The power system is tuned so that a fresh ship with a default loadout:
- Can make a comfort-range jump and arrive with ~30-50% power remaining
- Can perform a comfort-range scan without fully depleting
- Cannot do a comfort-range jump AND a comfort-range scan back-to-back without waiting for recharge
- Has shields drawing slowly enough that recharge outpaces shield draw when nothing else is active

**Open:** Specific values for `baseJumpPowerPerLy` and `baseScanPowerPerLy` need playtesting. The constraint is that power should feel meaningful but not punishing at comfort range.

---

## 5. Jump Physics

A jump consumes core life, drains power, and takes time. All three scale with distance. Core life cost and power cost are further multiplied by strain past comfort range. Duration is not.

### Formulas

```
comfortRange = drive.sustain × coreOutput × perfRatio

coreCost  = distance × core.mult_b × drive.mult_b × throttle × strain
powerCost = distance × baseJumpPowerPerLy × strain
duration  = (distance × baseJumpSecondsPerLy) / (amplitude × throttle)
amplitude = drive.mult_c × coreOutput × perfRatio
```

### Why Duration Is Not Strained

The ship travels at the same speed regardless of distance. Strain is an energy tax — the drive burns hotter to sustain its field past comfort range, consuming more core life per ly. It doesn't physically slow down. A 14 ly jump on a DR-505 costs ~4× normal in core life but arrives at the same speed as a 7 ly jump.

### The Jump Decision

Before every jump, the pilot sees:
- **Distance** and whether it's within comfort
- **Core life cost** at the current throttle setting (strained if past comfort)
- **Power cost** (strained if past comfort) and whether they have enough
- **Duration** at the current throttle
- **Strain factor** as a multiplier they can evaluate

The pilot adjusts throttle and commits. The action record captures distance, throttle, and computed costs.

---

## 6. Scan Physics

A scan costs power, takes time, and has a probability of success. Power cost and success chance are affected by strain past comfort range. Duration is not (but is affected by effort).

### Formulas

```
comfortRange = sensor.sustain × coreOutput

powerCost = distance × baseScanPowerPerLy × strain
duration  = distance × baseScanSecondsPerLy × sensor.mult_a × effort
chance    = min(sensor.chance, (sensor.chance / strain) × effort)
```

### The Triple Pressure

Past comfort range, three things work against you:
1. **Power cost** climbs (strain multiplier)
2. **Success chance** drops (strain divides base chance)
3. **Time invested** increases (linear with distance)

The pilot's effort setting lets them push back on chance at the cost of more time, but power cost is fixed by distance and strain. A long-range scan is always an expensive gamble.

### The Scan Decision

Before every scan, the pilot sees:
- **Distance** and whether it's within comfort
- **Power cost** (strained if past comfort)
- **Success chance** at the current effort setting, degraded by distance
- **Duration** at the current effort
- **Strain factor** as context for the cost/chance numbers

The pilot adjusts effort and commits. If the scan fails, the power and time are lost. That's the gamble.

---

## 7. Shield Physics

Shields regenerate continuously, drawing power while below maximum. The pilot controls regen speed via shield priority.

### Formulas

```
capacity  = shield.capacity
regenRate = shield.rate × priority
draw      = shield.baseDraw × priority
timeFull  = (capacity / regenRate) × 3600
```

### Shield Contention

Shield draw competes with core recharge. At high priority, shields recover fast but starve the power capacitor. At low priority, shields creep up slowly while power stays available for jumps and scans.

After a jump (power depleted), the pilot faces a choice:
- **High shield priority:** Shields come up fast, but power recovers slowly. Safe against threats but delays next action.
- **Low shield priority:** Power recovers fast, enabling a quick scan or follow-up jump, but shields stay low. Efficient but vulnerable.

---

## 8. Component Experience

Components improve with use. A logarithmic curve rewards early use heavily and plateaus at veteran levels. Each component type has a paired buff and nerf — experience doesn't just make things better, it makes them *opinionated*.

### The Curve

```
buffFactor(usage) = log(1 + usage) / log(1 + 100)

At 0:    0.00  (factory fresh)
At 10:   0.50  (50% of max — a week of play)
At 50:   0.83  (83% — a committed pilot)
At 100:  1.00  (100% — months of play)
At 200:  1.15  (115% — diminishing returns)
```

### Application

Experience modifies base stats before they enter the formula pipeline:

```
effectiveStat = baseStat × (1 + buffFactor × maxBuff)     // for buffs
effectiveStat = baseStat × (1 - buffFactor × maxNerf)     // for nerfs
```

### Buff/Nerf Pairs

**Core:**
```
Buff: output stability    mult_a × (1 + factor × 0.15)
  At 100 uses: 1.0 → 1.15 output. Cascades through comfort range,
  amplitude, recharge — everything gets a little better.

Nerf: capacity decay      hp × (1 - factor × 0.12)
  At 100 uses: 750 → 660 ly. The core pushes harder but dies sooner.
```

**Drive:**
```
Buff: amplitude bonus     mult_c × (1 + factor × 0.20)
  At 100 uses: 1.0 → 1.20 amplitude. Faster jumps.

Nerf: consumption creep   mult_b × (1 + factor × 0.25)
  At 100 uses: 1.0 → 1.25 consumption. Hungrier for power.
```

**Sensor:**
```
Buff: accuracy bonus      chance × (1 + factor × 0.15)
  At 100 uses: DSC 0.60 → 0.69 chance. Counters distance penalty.

Nerf: power hunger        draw × (1 + factor × 0.30)
  At 100 uses: draw × 1.30. Drinks more power per scan.
```

**Shield:**
```
Buff: regen bonus         rate × (1 + factor × 0.20)
  At 100 uses: rate × 1.20. Faster recovery.

Nerf: capacity fade       capacity × (1 - factor × 0.10)
  At 100 uses: capacity × 0.90. Slightly smaller buffer.
```

**Nav Computer:**
```
Buff: route efficiency    mult_a × (1 + factor × 0.10)
  At 100 uses: skill × 1.10.

Nerf: none. Software doesn't wear mechanically.
```

### Experience Widens Specializations

A veteran component's specialization range extends with experience. A DR-705 at 100 uses might unlock throttle 3.5 (up from 3.0). The component gets more opinionated — better at what it's good at, more extreme in its tradeoffs.

### Condition

Separately from experience, component condition (0.0–1.0) degrades all beneficial stats:

```
conditionFactor = 0.5 + (condition × 0.5)

At 1.0: full performance
At 0.5: 75% performance
At 0.0: 50% — barely functional
```

Condition does NOT scale nerfs. A damaged component is worse at its job but doesn't become more power-efficient.

Experience and condition stack:

```
effectiveStat = baseStat × experienceModifier × conditionFactor
```

A 100-use drive at 0.3 condition: amplitude 1.20 × 0.65 = 0.78 effective. Worse than fresh, but repairable. Once repaired, it's back to 1.20. Experience survives damage.

---

## 9. Data Model

### Product Interface

```typescript
interface Product {
  id: number;
  slug: string;
  type: string;
  label: string;
  version: number;
  hp: number | null;
  footprint: number;
  rate: number | null;
  sustain: number | null;
  capacity: number | null;
  chance: number | null;
  draw: number | null;
  mult_a: number | null;
  mult_b: number | null;
  mult_c: number | null;
  tuning: { param: string; min: number; max: number } | null;
}
```

### Product Field Reference

```
Core (Epoch Labs):
  hp          core life in ly (1000/750/500)
  rate        power regen per hour (5/10/20)
  mult_a      base output multiplier (0.9/1.0/1.1)
  mult_b      jump cost multiplier (0.75/1.0/1.5)

Drive (DR-Series):
  sustain     comfort range sustain in ly (10/7/5)
  draw        continuous power draw while jumping
  mult_a      (unused — reserved)
  mult_b      power consumption / perfRatio denominator (0.6/1.0/1.5)
  mult_c      jump amplitude for duration (0.5/1.0/2.0)
  tuning      throttle range per model

Sensor (DSC/VRS/ACU):
  sustain     scan comfort range sustain in ly (7/5/3)
  chance      base scan success probability (0.60/0.70/0.85)
  draw        power draw during active scan
  mult_a      survey duration multiplier (2.0/1.0/0.5)
  tuning      effort range per model

Shield (Aegis Foundry):
  capacity    max shield hp (50/100/200)
  rate        shield regen per hour (20/10/5)
  draw        base power draw while recharging
  tuning      priority range per model

Nav Computer:
  mult_a      skill (0.3–0.9)
  mult_b      efficiency (0.5–1.0)
```

### Experience Curve Config

Per component type, not per product. Lives in `data/experience.json`:

```json
{
  "core":   { "buff": { "stat": "mult_a", "max": 0.15 }, "nerf": { "stat": "hp",    "max": 0.12 } },
  "drive":  { "buff": { "stat": "mult_c", "max": 0.20 }, "nerf": { "stat": "mult_b", "max": 0.25 } },
  "sensor": { "buff": { "stat": "chance", "max": 0.15 }, "nerf": { "stat": "draw",   "max": 0.30 } },
  "shield": { "buff": { "stat": "rate",   "max": 0.20 }, "nerf": { "stat": "capacity","max": 0.10 } },
  "nav":    { "buff": { "stat": "mult_a", "max": 0.10 }, "nerf": null }
}
```

### Component Instance Table

```sql
helm_components
├── id              BIGINT PRIMARY KEY
├── ship_id         BIGINT
├── product_id      BIGINT          -- references product catalog
├── slot            VARCHAR         -- core, drive, sensor, shield, nav
├── life            FLOAT NULL      -- remaining life (cores)
├── usage_count     INT DEFAULT 0   -- total uses for experience curve
├── condition       FLOAT DEFAULT 1 -- 0.0–1.0 degradation
├── version         INT DEFAULT 1   -- manufacturing run (from product catalog)
├── created_at      DATETIME
├── updated_at      DATETIME
```

### Ship State

No `power_mode` column. Active system draw is inferred from existing state:

- Drive draw → active if ship has a jump action in progress
- Shield draw → active if `shields_full_at` is in the future
- Sensor draw → active if ship has a scan action in progress
- Equipment draw → active if equipment is running an operation

Per-action tuning preferences stored in user meta, not ship state.

### Action Records

Each action stores the pilot's tuning choice at creation time:

```sql
helm_actions
├── ...existing columns...
├── tuning_value    FLOAT DEFAULT 1.0  -- effort/throttle/priority chosen
```

---

## 10. Workbench Evolution

The workbench proves every formula before it touches the game.

### Current State (modeled)

- Comfort range + strain (jumps and scans)
- Strain on jump core life cost
- Strain on scan power cost and success chance
- Sample distances extending past comfort with strain/chance per sample

### Next Steps

1. Add jump power cost formula
2. Add per-action tuning (effort/throttle) to formulas and CLI
3. Add `draw` field to shield, sensor, and drive data
4. Compute `totalDraw` and update `perfRatio` for system contention
5. Add experience curve math and `--usage` CLI flag
6. Add condition modifier and `--condition` CLI flag
7. Add specialization tuning ranges to product data
8. Update report output with all new fields

Each step is independently testable through the workbench.

### CLI Examples

```bash
# Per-action tuning
bun run wb report --jump.throttle=0.5 --scan.effort=2.0

# Component experience
bun run wb report --core.usage=50 --drive.usage=80

# Component condition
bun run wb report --drive.condition=0.7

# Combined
bun run wb report --core.usage=100 --drive.usage=100 --scan.effort=1.5

# Matrix sweep
bun run wb matrix --vary=drive --jump.throttle=0.5,1.0,2.0
```

---

## Open Questions

- **`drive.mult_a` is unused.** Currently equals `mult_c` for all drives. Options: remove it, repurpose it (strain curve shape?), or defer.
- **`baseJumpPowerPerLy` tuning.** Needs playtesting. Constraint: comfort-range jump should leave ~30-50% power remaining.
- **Experience widening specializations.** How much should the range extend? Linear with buffFactor? Capped? Needs a formula.
- **Nav computer experience.** Weakest candidate — no mechanical wear, no obvious nerf. Revisit when nav has manufacturer identity.
- **Version as manufacturing run.** Resolved: versions are manufacturing runs, not firmware. When a manufacturer releases v2, existing v1 units stay as-is. Only v2 is manufactured going forward. Old versions persist in the economy as legacy hardware — tradeable, repairable, but no longer produced.
