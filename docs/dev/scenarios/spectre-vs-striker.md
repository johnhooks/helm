# Scenario: Spectre vs Striker

A working document tracing how the ambush engagement plays out mechanically. Maps each phase against implementation status to identify what exists and what needs to change.

See `docs/conflict.md` for the design concepts (emergent stealth, actions vs state, engagement chain, parent-child actions).

---

## Passive Scanning Model

Passive scanning is always on. It's not an action — it's a ship state with a tunable frequency.

**The knob:** `passive_scan_interval` — seconds between samples. Tunable like shield priority. Range: 60s (fastest, expensive) to 600s (slowest, cheap). Default: 300s.

**The cost:** Capacitor drain scales with frequency. Faster updates cost more power. A miner wanting threat alerts every 5 minutes pays less than a Spectre wanting targeting-quality updates every 60 seconds.

**The output:** Each sample that detects something creates a `passive_scan` ship_action record. Not player-initiated — system-created at the configured interval. Same table, same REST endpoint, same client timeline as every other action.

```
ship_action: {
  type: 'passive_scan',
  status: fulfilled,
  deferred_until: null,
  result: {
    detections: [
      { emission_type: 'drive_spool', confidence: 0.52, tier: 'class' },
      { emission_type: 'shield_regen', confidence: 0.18, tier: 'anomaly' }
    ],
    noise_floor: 1.34,
    stellar_baseline: 1.0
  },
  created_at: 1709344200
}
```

No record created if the node is quiet — no point logging silence.

**Detection quality** is a function of how many samples have accumulated. More samples at higher frequency = higher confidence faster (integration gain, `sqrt(N)` from DSP formulas). The miner's slow interval builds confidence slowly — enough to know "something's here." The Spectre's fast interval builds targeting-quality confidence quickly — enough to attempt a lock.

Higher frequency also costs more capacitor, and for PVP-quality detections, the cost is higher still. Want faster, more reliable target data? Pay for it.

---

## Setup

**Spectre** (ambush predator):

-   Hull: Specter (light, fast, low signature)
-   Sensor: DSC Mk I (best passive detection)
-   Equipment: Torpedo launcher
-   Position: Node 47, dark (no shields, no active equipment, no actions)
-   Passive scan interval: 60s (fast, expensive — hunting mode)

**Striker** (combat patrol):

-   Hull: Striker (heavy shields, weapons ready)
-   Sensor: ACU Mk I (good pulse detection)
-   Equipment: Phaser array, ECM Mk I
-   Position: Node 42, shields up, scanning
-   Passive scan interval: 300s (default — not actively hunting)

---

## Phase 1: The Striker Arrives

The Striker jumps into Node 47.

```
t=0     Striker: jump action begins (spool phase at Node 42)
          -> drive_spool emission at Node 42 (envelope-shaped)
t=240   Striker: spool complete, ship moves to Node 47
          -> drive_spool emission ends at Node 42
          -> drive_cooldown emission begins at Node 47 (envelope-shaped)
t=420   Striker: cooldown complete, jump action fulfilled
          -> drive_cooldown emission ends
```

**Emission state at Node 47 during cooldown (t=240-420):**

-   Striker: `drive_cooldown` (fading envelope, continuous spectral type)
-   Striker: `shield_regen` (shields already engaged, continuous, faint 0.2 power)
-   Spectre: nothing (dark)

### Implementation Status

| Mechanic                                             | Status              | Notes                                                                                    |
| ---------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| Multi-phase jump (spool/cooldown)                    | **Implemented**     | Holodeck `jumpHandler`, three-phase resolve                                              |
| Drive envelope on spool/cooldown emissions           | **Implemented**     | Stage 4.5C, reads `CatalogProduct.driveDsp`                                              |
| Emission tracking (record on submit, end on resolve) | **Implemented**     | Stage 4.5A, `Engine.recordEmissions()` / `endEmissions()`                                |
| Cooldown emission at destination node                | **Implemented**     | Resolve phase creates emission at ship's new node                                        |
| Shield engagement as timestamp state                 | **Not implemented** | Currently shields are always "on". Need `shields_engaged_at`                             |
| Shield power-up curve formula                        | **Not implemented** | Need formula for ramp from 0 to max strength over time                                   |
| Shield regen emission from engagement                | **Partial**         | `computeEquipmentEmissions()` checks `shield < shieldMax`, but no engagement concept yet |

---

## Phase 2: The Spectre Listens

The Spectre has been sitting dark with passive scan at 60s interval. The system creates `passive_scan` records every 60 seconds. Until now, all detections arrays were empty — the node was quiet.

When the Striker arrives and starts emitting (cooldown + shield_regen), the next passive scan tick picks it up:

```
t=300   System creates passive_scan record for Spectre
          -> result: {
               detections: [
                 { emission_type: 'drive_cooldown', confidence: 0.41, tier: 'class' }
               ],
               noise_floor: 1.12,
               stellar_baseline: 1.0
             }

t=360   Next passive_scan tick — more integration, confidence grows
          -> result: {
               detections: [
                 { emission_type: 'drive_cooldown', confidence: 0.58, tier: 'type' },
                 { emission_type: 'shield_regen', confidence: 0.22, tier: 'anomaly' }
               ],
               noise_floor: 1.12,
               stellar_baseline: 1.0
             }

t=600   Several ticks later — high confidence
          -> result: {
               detections: [
                 { emission_type: 'shield_regen', confidence: 0.72, tier: 'type' }
               ],
               noise_floor: 1.05,
               stellar_baseline: 1.0
             }
          -> drive_cooldown has ended (t=420), only shield_regen remains
          -> Spectre now knows: a shielded ship is at this node
```

The DSC sensor's affinity for continuous emissions gives the Spectre good confidence on the shield_regen signal. Each tick adds samples and confidence grows via integration gain.

**The Striker's passive scan (at 300s interval) detects nothing.** The Spectre is dark — zero emissions. Even at higher frequency, you can't detect what isn't there.

### Implementation Status

| Mechanic                                     | Status              | Notes                                                                           |
| -------------------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| Passive detection computation                | **Implemented**     | Stage 4.5B, `Engine.queryPassiveDetection()`                                    |
| EM snapshot (aggregate emissions at node)    | **Implemented**     | `computeEMSnapshot()` with stellar baseline, noise floor, sources               |
| Sensor affinity from catalog                 | **Implemented**     | `SensorSystem.getSensorAffinity()` reads `CatalogProduct.sensorDsp`             |
| `passiveReport()` formula                    | **Implemented**     | `@helm/formulas`, returns detections with confidence                            |
| `informationTier()` mapping                  | **Implemented**     | `@helm/formulas`, confidence -> anomaly/class/type/analysis                     |
| `passive_scan` as system-created ship_action | **Implemented**     | `Engine.processPassiveScans()` creates fulfilled actions at configured interval |
| `passive_scan_interval` as ship state        | **Implemented**     | `InternalShipState.passiveScanInterval`, default 300s, passed via `ShipConfig`  |
| Capacitor drain from scan frequency          | **Not implemented** | Need power cost formula scaling with interval                                   |
| Integration gain across ticks                | **Not implemented** | Need to accumulate samples across multiple passive_scan records                 |
| Dark ship produces zero emissions            | **Implemented**     | `computeEquipmentEmissions()` only emits for active equipment / shield regen    |
| Own emissions excluded from detections       | **Implemented**     | `queryPassiveDetection()` filters by shipId                                     |
| Own emissions contribute to noise floor      | **Implemented**     | Noise floor computed before filtering                                           |

---

## Phase 3: The Decision

The Spectre's player checks in. Their timeline shows passive_scan records with a shielded ship at their node. Decision time.

They choose to engage. The engagement sequence is a series of state toggles — these are instant mutations, not actions:

```
t=700   Spectre: engage shields (state toggle)
          -> shields_engaged_at = 700
          -> shield_regen emission begins (faint, 0.2 power — louder during power-up)
          -> action slot: unaffected (state, not action)

t=700   Spectre: arm torpedoes (state toggle)
          -> weapons_armed_at = 700
          -> action slot: unaffected
```

**The Spectre is now emitting.** Shield regen is faint (0.2 power) but detectable. The Striker's passive scan (at 300s interval) might pick it up on the next tick — but may not, depending on the ACU's affinity for continuous signals and the confidence achieved in a single sample.

The critical timing question: **how long does the Spectre's shield power-up take?** This window is when the Spectre is emitting but not yet combat-ready. This is a formula tuning target for the workbench.

### Implementation Status

| Mechanic                             | Status              | Notes                                                        |
| ------------------------------------ | ------------------- | ------------------------------------------------------------ |
| Equipment activation as state toggle | **Implemented**     | `Ship.activateEquipment()` / `deactivateEquipment()`         |
| `shields_engaged_at` timestamp       | **Not implemented** | Shields currently have no engagement/disengagement concept   |
| Shield power-up curve                | **Not implemented** | Need formula: `shield_strength_at(now - shields_engaged_at)` |
| `weapons_armed_at` timestamp         | **Not implemented** | Weapons currently have no arming concept                     |
| Weapon readiness curve               | **Not implemented** | Need formula for weapon charge-up time                       |
| Shield engagement emission profile   | **Not implemented** | Power-up phase should emit louder than steady-state regen    |
| Weapon arming emission               | **Not implemented** | May or may not produce detectable emission                   |

---

## Phase 4: The Attack

The Spectre's player clicks "Fire torpedo at contact." This initiates a multi-phase action. The detection confidence from their passive_scan results feeds into the targeting lock probability.

```
t=760   Spectre: fire_torpedo submitted (target: detected contact)
          -> Phase 1: Targeting lock
            Input: detection confidence (0.72 from accumulated passive_scan results)
            Lock duration: weapon system + pilot skill
            weapons_fire emission begins (loud, 6.0 power)
            The Spectre is NOW highly visible

t=760   Striker's next passive_scan tick picks up weapons_fire
          -> confidence: 0.91, tier: "analysis"
          -> Striker's player sees: weapons emission detected

t=770   Spectre: fire_torpedo Phase 2 -> lock acquired, torpedo launched
          -> torpedo_flight_seconds: 120

t=890   Spectre: fire_torpedo Phase 3 -> engagement result
          -> torpedo impact calculated
          -> damage applied to Striker
          -> child action created on Striker's ship:
            Striker: torpedo_impact
              parent_id: <spectre's fire_torpedo action id>
              result: { shield_absorbed: 35, hull_damage: 5 }
```

**This is the commitment point.** The moment the targeting lock begins, the Spectre broadcasts a loud weapons_fire emission. The Striker's passive scan picks it up on its next tick.

### Implementation Status

| Mechanic                                               | Status              | Notes                                                                     |
| ------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------- |
| `fire_torpedo` handler                                 | **Implemented**     | Single-phase: validate, handle, resolve. Applies damage.                  |
| `fire_torpedo` as multi-phase (lock -> fire -> impact) | **Not implemented** | Currently single-phase instant resolve after flight time                  |
| Detection confidence as targeting lock input           | **Not implemented** | Currently `fire_torpedo` doesn't require prior detection                  |
| Targeting lock duration from weapon + pilot skill      | **Not implemented** | Need formula: lock_seconds = f(weapon, pilot_skill)                       |
| Lock probability from detection confidence             | **Not implemented** | Need formula: lock_chance = f(confidence, weapon_accuracy)                |
| Child action on target ship                            | **Not implemented** | Currently damage applied directly in handler. No action record on target. |
| `parent_id` on ship_action                             | **Not implemented** | No action chain/relationship model yet                                    |
| Weapons_fire emission during lock phase                | **Implemented**     | `fire_torpedo` handler declares `weapons_fire` emission                   |

---

## Phase 5: The Striker's Timeline

From the Striker's perspective, their timeline shows:

```
passive_scan records (system-created at 300s interval):
  t=600  -> detections: [] (nothing — Spectre was dark)
  t=760  -> detections: [{ emission_type: 'weapons_fire', confidence: 0.91, tier: 'analysis' }]
         -> warning: something is attacking

torpedo_impact (child action, parent: spectre's fire_torpedo):
  t=890  -> result: { shield_absorbed: 35, hull_damage: 5 }
```

The passive scan gave warning — if the Striker's interval caught the emission before impact. The impact is the event. Both are ship_action records on the Striker's ship. Whether the Striker knows who fired depends on the detection tier — `parent_id` links to the Spectre's action but that relationship is never sent to the client.

### Implementation Status

| Mechanic                                     | Status              | Notes                                                |
| -------------------------------------------- | ------------------- | ---------------------------------------------------- |
| Impact as ship_action on target's ship       | **Not implemented** | Need child action creation in fire handler's resolve |
| Identity from detection tier (not parent_id) | **Not implemented** | Detection tier determines what label the target sees |
| Passive scan warning before impact           | **Not implemented** | Requires passive_scan system + timing overlap        |

---

## Phase 6: The Aftermath

The Spectre is fully visible — weapons emission, shield emission, everything broadcasting. If the Striker survives, the fight becomes conventional. Both ships are emitting, both know about each other.

The Spectre's advantage was information asymmetry — it knew the Striker was there, the Striker didn't know about the Spectre. That advantage evaporated the moment the Spectre fired.

### Implementation Status

| Mechanic                | Status          | Notes                                                   |
| ----------------------- | --------------- | ------------------------------------------------------- |
| Sustained phaser combat | **Implemented** | `fire_phaser` handler with duration-based drain         |
| Mutual damage in combat | **Implemented** | Both ships take component wear                          |
| Escape via jump spool   | **Implemented** | Can submit jump action to flee (spool reveals position) |

---

## The Pair Ambush

Two Spectres change the math. Coordinated torpedo salvos overwhelm shields that a single salvo wouldn't break.

```
Both Spectres: passive_scan ticks -> both detect Striker over time
Both Spectres: engage shields (parallel, state toggle)
Both Spectres: fire_torpedo (coordinated timing)
  -> Two salvos arrive simultaneously
  -> Combined damage exceeds Striker shield capacity
  -> Striker takes hull damage before responding
```

The coordination requirement is real — both players need to be online and time their attacks. A missed window means one Spectre fires alone, the Striker survives, and both Spectres are now visible.

### Key Questions for Workbench Validation

| Question                                          | Target Answer                 | How to Measure                                        |
| ------------------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| Can a single torpedo salvo break Striker shields? | Usually no                    | Scenario: solo Spectre vs Striker                     |
| Do two simultaneous salvos break shields?         | Usually yes                   | Scenario: pair Spectre vs Striker                     |
| Striker reaction window (detect -> impact)?       | 60-180 seconds                | Measure t(weapons_fire detected) to t(torpedo_impact) |
| Shield power-up time for Spectre?                 | 30-60 seconds                 | Formula tuning target                                 |
| Does Striker ECM degrade Spectre's passive scan?  | Meaningfully but not fatally  | Scenario with/without ECM, compare confidence         |
| Can any scan detect a fully dark ship?            | Never                         | Must be: zero emissions = zero detection              |
| How many ticks to reach lock threshold?           | 3-8 ticks (DSC) vs 5-12 (ACU) | Sweep across sensor types and intervals               |
| Capacitor cost of 60s interval vs 300s?           | Meaningful but sustainable    | Spectre shouldn't drain dry from listening            |

---

## Implementation Roadmap

What this scenario requires that doesn't exist yet, in rough dependency order:

### 1. Passive Scan System

-   `passive_scan_interval` as tunable ship state (like `shieldPriority`)
-   Capacitor drain formula scaling with interval
-   System creates `passive_scan` ship_action records at configured interval
-   Integration gain across accumulated samples
-   No record when node is quiet

### 2. Shield Engagement State

-   `shields_engaged_at` on `InternalShipState`
-   Shield power-up curve formula in `@helm/formulas`
-   `ShieldSystem` reads engagement timestamp, computes current strength via `shields_full_at`
-   Emission profile: louder during power-up, silent when full

### 3. Weapon Arming State

-   `weapons_armed_at` on `InternalShipState`
-   Weapon readiness formula
-   Possibly faint emission during charge

### 4. Detection-Gated Targeting

-   `fire_torpedo` / `fire_phaser` require prior detection above confidence threshold
-   Detection confidence feeds into lock probability
-   Multi-phase fire: lock attempt -> fire -> impact
-   Lock duration from weapon system + pilot skill (not sensor)

### 5. Parent-Child Actions

-   `parent_id` on `ShipAction`
-   Fire handler resolve creates child impact action on target ship
-   Client queries own actions, sees impacts
-   Identity revealed based on target's detection tier, not parent relationship

### 6. Workbench Scenarios

-   Solo Spectre vs Striker scenario
-   Pair Spectre vs Striker scenario
-   Shield power-up timing sweep
-   Detection warning window measurement
-   ECM impact on ambush effectiveness
-   Scan frequency cost/benefit analysis
