# Envelopes, Sweeps, and the Decision Point

How ship actions create interesting decisions through time-shaped power behavior and checkpoint-based scheduling.

This document captures the design direction from the game mechanics discussion. It replaces the earlier synth-metaphor exploration with a focused commitment to two concrete mechanics: **drive envelopes for jumps** and **sensor sweep patterns for scans**. The goal isn't to make the ship a synthesizer. It's to make action initialization — the moment before you commit to a jump or scan — feel like a meaningful decision based on your ship's current state.

---

## The Core Idea

The original formula system deducts power upfront and resolves actions at completion. The pilot sets tuning, commits, waits, gets a result. The decision is "can I afford this?" and the answer is usually yes.

The envelope model changes this. Power isn't deducted — it's **drawn over time**. The ship's state during the action matters, not just at initiation. And actions resolve at **checkpoints**, not at completion — meaning early success, interruption, and state-dependent outcomes are all possible.

This creates a richer decision at initialization: not "can I afford this?" but "given my current power, shield state, and what I just finished doing, what happens if I commit to this right now?"

---

## Drive Envelope (Jumps)

A jump isn't an instant power deduction. The drive draws power continuously across three phases:

```
power draw
    │
    ┃━━━━━━━━━━━━━━━━━━━┓
    ┃                    ┃╲
    ┃  spool    sustain  ┃  ╲  cooldown
    ┃                    ┃    ╲
────┸────────────────────┸──────╲──── time
    ^ jump starts        ^ arrive  ^ drive cooled
```

**Spool (attack).** Large initial draw as the drive field forms. The commitment cost — once you start spooling, power is consumed whether you complete the jump or not.

**Sustain.** Steady draw during transit. The drive maintains the warp field. Net power during transit = `regenRate - driveDraw - shieldDraw`. If net is negative, the capacitor drains throughout the jump.

**Cooldown (release).** Drive winds down after arrival. Draw tapers to zero. The ship is "hot" — power is still being consumed and the drive's EM signature interferes with sensors.

### What This Changes

With the current flat model, a 7-hour jump on an Epoch-S (regen 10/hr) always arrives at full power because transit time exceeds recharge time. Power is never a constraint.

With the envelope:

| Combo            | Sustain Draw | Net During Transit     | 7hr Jump: Arrive At |
| ---------------- | ------------ | ---------------------- | ------------------- |
| DR-505 + Epoch-S | 4/hr         | +6/hr (gaining)        | ~86% (from 44%)     |
| DR-705 + Epoch-S | 8/hr         | +2/hr (barely gaining) | ~58%                |
| DR-705 + Epoch-E | 8/hr         | **-3/hr (losing)**     | ~23%                |
| DR-505 + Epoch-E | 4/hr         | +1/hr (barely gaining) | ~51%                |

The DR-705 + Epoch-E combo **loses power during transit**. The pilot might not make it. Pre-jump state matters. Running shields at high priority during transit competes with drive draw.

### Envelope Shape Per Drive

Each drive has a different envelope personality:

**DR-305 (Economy).** Gentle spool, low sustain draw, quick cooldown. The ship barely notices the drive is running. Scan almost immediately after arrival. The patient pilot's drive.

**DR-505 (Standard).** Moderate everything. Noticeable cooldown but nothing dramatic. The reliable middle ground.

**DR-705 (Boost).** Aggressive spool (high initial spike), heavy sustain draw, long cooldown. The ship runs hot the whole way and takes time to settle after arrival. There's a recovery window after every jump where the ship is still cooling and the sensor is degraded.

### Envelope Parameters

Each drive carries envelope parameters alongside existing stats:

```
drive.draw         → sustain draw rate (already exists)
drive.spoolDraw    → spool phase draw intensity
drive.spoolSeconds → spool phase duration
drive.coolSeconds  → cooldown phase duration
```

The total energy consumed by the envelope shapes the power curve. The sustain draw (`drive.draw`) during transit is the dominant term for long jumps.

---

## Sensor Sweep Pattern (Scans)

Scans aren't one dice roll after waiting. The sensor sweeps in a repeating pattern — each peak is a detection opportunity. Multiple peaks across the scan duration give multiple chances.

```
draw
  │         ╱╲   ╱╲   ╱╲   ╱╲
  │    ╱╲  ╱  ╲ ╱  ╲ ╱  ╲ ╱  ╲╲
  │   ╱  ╲╱    ╳    ╳    ╳    ╲ ╲
  │  ╱                          ╲╲
  │ ╱  ramp up   sweep peaks     ╲  wind down
──┸────────────────────────────────╲──── time
   ^ scan starts                     ^ scan ends
```

### Cumulative Probability

Each sweep peak rolls for detection independently:

```
P(detect across all sweeps) = 1 - (1 - chancePerSweep) ^ numSweeps
```

More sweeps = more chances. A scan that misses on sweep 1 might hit on sweep 4. The per-sweep chance is derived from the sensor's base chance: `perSweep = 1 - (1 - sensor.chance)^(1 / baseSweeps)`.

### Sensor Character Through Sweep Period

All sensors make roughly the same number of sweeps at standard effort (~6). What differs is the **period** between sweeps, because scan duration differs:

| Sensor   | Comfort | Duration | Period  | Per-Sweep Chance | Cumulative |
| -------- | ------- | -------- | ------- | ---------------- | ---------- |
| ACU Mk I | 3 ly    | ~30 min  | ~5 min  | ~26%             | 85%        |
| VRS Mk I | 5 ly    | ~1 hr    | ~10 min | ~19%             | 70%        |
| DSC Mk I | 7 ly    | ~2 hrs   | ~20 min | ~14%             | 60%        |

The ACU fires rapidly — quick feedback, fast answer. The DSC dwells long on each sweep — deep, patient integration. Same number of chances, different tempo.

### Effort Controls Sweep Count

Effort scales the number of sweeps:

-   **effort 0.5:** 3 sweeps. Quick and dirty. Lower cumulative probability.
-   **effort 1.0:** 6 sweeps. Rated performance.
-   **effort 2.0:** 12 sweeps. Longer scan, higher cumulative probability.

This solves the original "effort > 1.0 is useless within comfort" problem. Even within comfort range (strain = 1.0), more sweeps means more rolls. Cumulative probability at effort 2.0 is meaningfully higher than at 1.0.

Past comfort range, strain degrades each individual sweep's chance. More sweeps partially compensate, but the per-sweep degradation means even high effort can't fully recover at extreme distances.

### Sweep Parameters

```
sensor.sweeps     → base sweep count at effort 1.0 (e.g., 6)

sweepCount   = sensor.sweeps × effort
scanDuration = distance × baseScanSecondsPerLy × sensor.mult_a × effort
sweepPeriod  = scanDuration / sweepCount
```

Note: `baseScanSecondsPerLy` needs to increase from 30 to ~600–1200 for hour-scale scans matching the vision doc.

---

## Checkpoint-Based Scheduling

`deferred_until` points to the **next checkpoint**, not the action's completion.

```
OLD: Action created → deferred_until = completion → resolve
NEW: Action created → deferred_until = next checkpoint → evaluate → reschedule or resolve
```

At each checkpoint, the game evaluates current state and either:

-   **Continues:** reschedule to next checkpoint
-   **Resolves early:** scan found something, jump arrived
-   **Interrupts:** power ran out, dropped out of warp

### Jump Checkpoints = Waypoints

```
Jump: Sol → W1 → W2 → W3 → Tau Ceti

1. deferred_until = ETA(W1).
2. Fire at W1. Compute power state using envelope integral.
   Power OK → update position, deferred_until = ETA(W2).
3. Fire at W2. Power insufficient → drop out of warp. Interrupted.
   — or —
   Power OK → continue to W3.
4. Arrive at Tau Ceti. Drive enters cooldown.
```

At each waypoint: power check (can the drive sustain the next leg?), discovery events (derelict, anomaly), encounter check (another ship), core life check.

### Scan Checkpoints = Sweep Peaks

```
Scan: 5ly, VRS Mk I, effort 1.0, 6 sweeps over ~1 hour

1. deferred_until = peak(1). Roll detection. Miss. → peak(2).
2. Roll. Miss. → peak(3).
3. Roll. Hit! → Resolve early: "Contact detected on sweep 3."
   Scan duration: 30 min instead of 1 hour.
```

Early resolution is the key payoff. A 2-hour scan might finish in 20 minutes if early sweeps hit. That's exciting in a way that "wait exactly 2 hours" never is.

### Checkpoint Frequency Constraint

**No checkpoint should fire more often than every 10–15 minutes.** This preserves the async pace.

The LCARS display can show a higher-frequency visual (12–18 sweep peaks for a rich animation). The server only fires every 3rd or 4th peak, retroactively evaluating the ones it skipped. The display is rich, the server is lazy, the math is correct regardless.

Practical load: a scan with 6 sweeps over 1 hour = 6 events. A jump with 4 waypoints over 7 hours = 4 events. Even at 1,000 active ships, that's a few thousand simple events spread across hours. Each event: read state, do arithmetic, write result, schedule next.

---

## Timestamp Math

Everything computes from timestamps. No game tick.

At any moment, power is:

```
power_at(now) = initial_power
              - ∫ total_draw(t) dt from action_start to now
              + ∫ regen_rate dt from action_start to now
              clamped to [0, capacitor]
```

Each envelope phase is piecewise linear, so the integral is geometry:

-   **Spool:** `spoolDraw × spoolDuration` (rectangle)
-   **Sustain:** `sustainDraw × transitDuration` (rectangle)
-   **Cooldown:** `sustainDraw × cooldownDuration / 2` (triangle)
-   **Sweep LFO:** `baseDraw × duration + amplitude × (1 - cos(2πfT)) / (2πf)` (sine integral)
-   **Shield:** `shieldDraw × duration` (rectangle, while shields < max)
-   **Regen:** `regenRate × duration` (rectangle)

Overlapping draws are additive. The integral of the sum is the sum of the integrals.

`power_empty_at` can be computed in advance: given current power and net drain rate, when does it reach zero? This feeds into checkpoint scheduling and the pre-action projection the pilot sees.

The client renders the same math. The sensor sweep waveform on the LCARS display is computed from the same parameters. The power gauge computes `power_at(now)` from the same envelope functions. When heartbeat brings a checkpoint result, the client incorporates it. No special "live mode" — the pilot watching and the pilot sleeping get the same game.

---

## The Decision Point

This is where the game lives. Every time the pilot initializes a jump or scan, their ship is in a unique state. The decision isn't "configure my ship" — it's "given my ship's current state, what do I do?"

### Pre-Jump Assessment

The pilot sees their route, current power, shield state, and a projection:

> **Route:** Sol → W1 → W2 → Tau Ceti (3 legs, 7 ly total)
> **Power:** 72%. Shield draw: 5/hr (shields at 80%). Drive sustain: 4/hr. Regen: 10/hr.
> **Net during transit:** +1/hr. **Arrival power:** 76%.
> **Core cost:** 7.0 ly at throttle 1.0. Core life remaining after: 333 ly.

Comfortable. But what if they push throttle to 1.5?

> **Throttle 1.5.** Duration: 4.7 hrs (was 7). Core cost: 10.5 ly. Remaining: 329 ly.
> **Arrival power:** 73%. All waypoints clear.

Faster, more core life burned. Still safe. Worth it?

Now the same ship at 41% power, shields at 30% and regenerating hard:

> **Power:** 41%. Shield draw: **10/hr** (shields low, priority 1.0). Drive sustain: 4/hr. Regen: 10/hr.
> **Net during transit: -4/hr.** > **W1:** 37%. **W2:** 33%. **W3:** 29%.
> **⚠ Power below 25% at W3. Drive may fail to sustain field.**

Now the decision matters:

1. **Wait ~40 minutes** for shields to fill. Shield draw stops. Net becomes +6/hr. Jump safely. But 40 minutes idle.
2. **Drop shield priority to 0.5** before jumping. Shield draw drops to 5/hr. Net becomes +1/hr. Arrive with power, shields still recovering slowly.
3. **Jump and accept the risk.** Maybe W3 is close enough to Tau Ceti. Maybe not. The projection says it's tight.
4. **Pick a shorter route.** Fewer waypoints, longer legs (more strain per leg), but fewer checkpoints to survive.

Four meaningfully different choices. No sliders. No configuration. Just a pilot reading instruments and making a call.

### Pre-Scan Assessment

Pilot just arrived. Drive in cooldown — 12 minutes remaining. Wants to scan at 5 ly:

> **Drive cooldown:** 12 min remaining. EM interference: elevated.
> **Sensor:** VRS Mk I. 6 sweeps, ~1 hour, effort 1.0.
> **Sweep 1** (10 min): overlaps cooldown. Detection chance reduced.
> **Sweeps 2–6:** full chance.
> **Cumulative probability:** 72% (vs 76% if you wait for cooldown).
> **Power cost:** 10. Power after scan: 62%.

4% difference. Probably scan now. But at 7 ly (past comfort, every sweep already strained)?

> **Distance:** 7 ly. **Strain:** 1.19. Each sweep degraded.
> **Sweep 1:** reduced further by cooldown overlap.
> **Cumulative probability:** 48% (vs 54% waiting). **Power cost:** 16.

Now that 6% matters. And the power cost is higher, leaving less for the follow-up jump. Wait 12 minutes, or burn the power and accept worse odds?

Push effort to 2.0?

> **Effort 2.0.** 12 sweeps, ~2 hours. Cumulative: 73%.
> **Power:** starts 68%, net +2/hr during scan. Comfortable.
> **But:** 2 hours committed. Can't jump for 2 hours.

73% is compelling. But during those 2 hours, someone might find you. Or a better opportunity might pass. The scan is a time commitment, not just a power commitment.

### The Sequencing Game

The most interesting decisions aren't about any single action. They're about sequencing:

**Scan first or jump first?** If you scan before jumping, you spend power and time but know what's ahead. If you jump first, you arrive with drive cooldown and possibly depleted — not ideal for scanning.

**Quick scan or deep scan?** Effort 0.5 (3 sweeps, 15 min) gives a fast answer with low probability. If it hits, you saved an hour. If it misses, was it worth the power? You could follow up with another quick scan — each one is an independent set of rolls.

**Chain jumps or rest between?** Back-to-back jumps mean the second spool overlaps with the first cooldown. More total power consumed. But resting between jumps means time not traveling. The DR-305's quick cooldown makes chaining cheap. The DR-705's long cooldown makes it expensive.

**Shields up or shields down during transit?** High shield priority during a jump competes with drive draw. Low priority saves power but leaves you vulnerable at waypoints. The answer depends on whether you expect trouble at the waypoints — which depends on what you know about the route.

None of these require configuration. They emerge from the state the ship is in and the timing of the envelope/LFO mechanics.

---

## Component Drift

Over time, components specialize based on how they've been used. This isn't configured — it's emergent.

### Usage-Based Drift

Each component tracks a drift vector — weights representing how its experience is distributed. A core that's powered 300 jumps and 50 scans has drifted toward drive-compatible output. The weights shift based on what actions the component participates in.

```
core.drift = {
  totalUsage: 350,
  weights: { drive: 0.86, sensor: 0.14 }
}
```

### Drift Effects

Drift modifies the buff side of the existing experience curve. The buff is strongest in the direction the component has drifted:

-   A drive-drifted core gets full output buff when powering jumps, partial buff when powering scans
-   A sensor-drifted sensor gets full accuracy buff on scans
-   The nerf (power draw, capacity decay) is always unconditional — wear doesn't care about specialization

### Why Perfection Is Impossible

Drift rates are asymmetric:

-   **Drive drift** accumulates per jump (frequent, short actions)
-   **Sensor drift** accumulates per scan (infrequent, long actions)
-   **Shield drift** accumulates passively (slow, continuous)

The pilot who explores aggressively (lots of jumps) naturally drifts toward drive even if they want balanced drift. To build deep sensor drift, they'd need to sit and scan repeatedly — which means not exploring. The exciting gameplay produces drive-heavy drift. Balancing requires boring gameplay.

Since weights sum to 1.0, specializing in one direction dilutes others. Every component in the ship drifts at a different rate because each participates in different action types. The system is too multi-dimensional to optimize analytically. The pilot develops intuition instead.

### Co-Evolution

Components that have been in the same ship for hundreds of actions develop complementary drift. Swapping one component breaks the alignment. The new component works — but the drift bonuses are weaker until the ship re-harmonizes through continued use.

Re-harmonization rate depends on component age: young components adapt in ~50 actions. Veterans take 500+. This creates a real cost to upgrades that isn't about credits — it's about time.

---

## Shield Harmonics (Proposed)

> **Status:** Not committed. This is an idea that fits the system but needs more thought before we decide to build it.

The drive has an envelope. The sensor has an LFO. Shields currently have... a flat draw. They're important for creating power tension in the decision point, but they don't have their own time-shaped behavior. Shield harmonics would give them one.

### The Concept

Shield regeneration isn't linear — it oscillates. The shield emitter produces a standing wave pattern as it rebuilds the field. Fresh shields oscillate loosely (wide amplitude, unpredictable regen rate). As the shield settles, the oscillation tightens into a stable harmonic — regen becomes smoother and more efficient.

```
regen rate
    │
    │  ╱╲    ╱╲
    │ ╱  ╲  ╱  ╲    ╱─╲  ╱─╲  ╱─╲
    │╱    ╲╱    ╲──╱   ╲╱   ╲╱   ╲──── settling...
    │
────┸──────────────────────────────────── time
    ^ shields hit       ^ harmonic stabilizing
```

This maps to what `docs/gameplay.md` already describes as flavor: "Degraded shields recharge slower but the frequency has settled into a stable harmonic." The proposal is to make that literal.

### How It Would Work

After shields take damage, regen enters a **settling period**. During settling:

-   Instantaneous regen rate varies — sometimes above rated, sometimes below
-   Average regen over the full settling period equals the rated regen rate (no net buff or nerf to total recovery time)
-   The variation matters because **checkpoints sample instantaneous state** — a waypoint arrival during a regen trough means lower shields than expected

Each shield product would have a harmonic personality:

-   **Bastion series (tank):** Long settling period, narrow amplitude. Slow to destabilize, slow to re-stabilize. Predictable even when disrupted.
-   **Aegis series (balanced):** Moderate settling, moderate amplitude. The middle ground.
-   **Veil series (fast):** Short settling period, wide amplitude. Destabilizes easily, re-stabilizes quickly. Spiky regen — sometimes great, sometimes poor.

### Why It Could Be Interesting

**It makes shield state less predictable after combat.** Right now, shield recovery is a known quantity — X% per hour, done. With harmonics, the pilot knows their shields will be back in N hours, but the path there is wavy. Timing a jump departure during a regen peak vs trough creates a micro-decision.

**It differentiates shield products beyond stats.** The Veil's fast settling means it recovers its harmonic quickly after each hit — good for frequent small encounters. The Bastion's stability means it barely wobbles — good for sustained situations where predictability matters.

**It completes the trio.** Drive envelope, sensor LFO, shield harmonic. Each system has a time-domain waveform. Each creates non-obvious interactions with the others. The pilot who understands all three waveforms and their phase relationships has deeper situational awareness.

### Concerns

**Complexity budget.** Drive envelopes and sensor sweeps already create rich decision points. Shield harmonics might add complexity without proportional gameplay value — shields are mostly passive, not something the pilot initiates.

**Observability.** The pilot can see their shield percentage, but can they read the harmonic state? If it's not legible in the UI, it's just hidden randomness, which feels unfair rather than interesting.

**Does flat actually work fine?** Shields as a constant power draw already create real tension in the decision point (shields vs drive during transit, wait for shields vs jump now). Adding oscillation might not improve those decisions.

### If We Build It

It would slot in alongside or after Phase 3 (Drift). The timestamp math is straightforward — damped oscillation is a closed-form function. The harmonic state at any time `t` after disruption:

```
regenRate(t) = baseRegen × (1 + amplitude × e^(-dampingRate × t) × sin(2π × frequency × t))
```

The integral (total regen over a period) has a closed-form solution, so checkpoint evaluation stays cheap. Shield power at any timestamp is computable without simulation.

---

## Implementation Path

### Phase 1: Drive Envelope

-   Add `spoolDraw`, `spoolSeconds`, `coolSeconds` to drive product data
-   Implement piecewise power integration for jump actions
-   Checkpoint scheduling at waypoints
-   Power projection in jump initialization UI
-   Update workbench to model envelope behavior

### Phase 2: Sensor Sweep

-   Add `sweeps` to sensor product data
-   Implement sweep-based detection with cumulative probability
-   Checkpoint scheduling at sweep peaks
-   Update `baseScanSecondsPerLy` to ~600–1200
-   Scan initialization UI showing sweep count, period, projected probability

### Phase 3: Drift

-   Add `drift_weights` to component data model
-   Drift accumulation on action completion
-   Drift-modified buff computation
-   LCARS visualization of component specialization

### Phase 4: Decision Point UI

-   Real-time power projection on jump/scan initialization
-   "What if" previews for different tuning values
-   Drive cooldown status affecting scan projections
-   Route comparison for different waypoint paths

---

## What We Decided Against

Through the design discussion, we explored and rejected several concepts:

**Synth patching / patch bay.** Configurable signal routing between ship systems. Rejected because it's configuration management, not piloting. The ship isn't a synth — it's a ship.

**Power routing sliders.** Distributing core output across systems via adjustable allocation. Rejected because sliders encourage constant fiddling ("X-Wing power management") and feel like busy work rather than meaningful decisions.

**Ship profiles / operating modes.** Named configurations that change formula coefficients. Rejected as a dressed-up slider system.

**Sonification.** Rendering the ship's signal chain as audio. Interesting but dependent on mechanics that were rejected (configurable signal routing). Could revisit if the envelope/LFO visualizations suggest audio would add value.

**Thermal management as a system.** Heat as a separate resource with its own filter mechanics. Rejected as an additional resource to manage. Power contention already creates enough tension.

What survived from the synth exploration: the envelope concept (ADSR shapes for drive behavior), the LFO concept (oscillating sweep pattern for sensors), and the drift concept (components specializing through use like analog circuits developing character). These map directly to computable mechanics without requiring the pilot to think about signal chains.

---

## Open Questions

-   **Envelope parameters:** Store explicitly in product data, or derive from existing stats? Explicit is clearer but adds fields. Derived is elegant but harder to tune independently.

-   **Drive cooldown affecting sensors.** How much does the EM interference from cooldown actually degrade sensor sweeps? Needs tuning — too much and pilots always wait, too little and it doesn't matter.

-   **Power-at-zero behavior.** When the capacitor hits zero during a jump, does the ship immediately drop out at the nearest waypoint? Or does the drive have a brief grace period (draining core life directly)?

-   **Overlapping actions.** Can a pilot scan during a jump? If so, sensor LFO overlaps drive sustain. The draw math handles it (additive), but should the drive's field actively degrade sensor performance? Gameplay question.

-   **Cooldown stacking.** Can a pilot start a new jump before cooldown completes? If so, spool draws stack on remaining cooldown — extra power cost for impatience.

-   **Quick-scan viability.** At effort 0.25 (VRS specialization), a scan might be 3 sweeps over ~15 minutes. That's frequent enough to spam. Is "scan a lot at low effort" an interesting strategy or degenerate behavior?
