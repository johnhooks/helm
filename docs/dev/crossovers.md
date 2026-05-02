# Crossover Products & DSP Identity Floors

## DSP Identity Floors

Hard caps on weak-stat DSP values preserve archetype identity across all marks and versions. Strengths remain uncapped — floors only limit how much a sensor's weak axis can improve, whether through a new mark or a balance-driven version change.

| Sensor | active cap | passive cap | pulseGain cap | continuousGain cap |
| ------ | ---------- | ----------- | ------------- | ------------------ |
| DSC    | 0.85       | —           | 0.85          | —                  |
| VRS    | 1.15       | 1.15        | 1.15          | 1.15               |
| ACU    | —          | 0.75        | —             | 0.85               |
| MIL    | —          | 0.85        | —             | 0.90               |
| NPL    | 0.40       | —           | 0.90          | —                  |

**Rationale:** Without floors, accumulating stat improvements across marks and balance patches could cause archetype convergence. A DSC at high marks shouldn't approach VRS-level active scanning — that erodes its identity as a passive-first sensor. Floors guarantee permanent archetype differentiation regardless of how many marks or version changes a product line goes through:

-   DSC is always ≥15% worse than VRS at active scanning
-   ACU is always ≥25% worse at passive detection
-   MIL is always ≥15% worse at passive, ≥10% at continuous gain
-   VRS stays "good at everything, best at nothing" with soft caps
-   NPL is always ≥60% worse at active scanning — it never broadcasts

## Crossover Products

Crossovers appear at Mk II. Each is built by a manufacturer working outside their core competency. The resulting component is **objectively worse** on standard metrics than the weakest native product in its category, but carries a **mechanical ability** inherited from the manufacturer's home domain.

### Aegis Testudo (`aegis_testudo`)

**Manufacturer:** Aegis (shields) → builds a drive

Shield company applies shield-harmonic technology to warp field generation. The drive is slow, short-range, and power-hungry — but shield harmonics allow shields to regenerate at 0.5x rate during jump transit, when normally shields are offline. Named after the Roman tortoise formation — moving while shielded.

**Standard stats vs DR-307 v1 (weakest native drive):**

-   Sustain: 6.0 vs 12.0 (worse range)
-   Speed: 0.55x vs 0.55x (matched)
-   Consumption: 1.20x vs 0.50x (far more expensive)
-   Draw: 3.5 vs 2.0 (hungrier)
-   Footprint: 28 vs 25 (bigger)

**DSP envelope:** Unique shield-harmonics signature. Long gentle spool (240s, curve 1.8), quiet peaks, smooth cooldown. Looks like a continuous hum, not a drive chirp — ACU pulse filters barely register it. Spookily quiet for a drive, which has interesting detection implications.

**Mechanic:** Transit Shield Harmonics — shield regen continues at 0.5x normal rate during jump sustain phase.

### Epoch Sensor 2 (`epoch_sensor_2`)

**Manufacturer:** Epoch (cores) → builds a sensor

Core company builds a sensor that reads warp core harmonics instead of the EM spectrum. Bad range, terrible accuracy, glacial surveys — but scans draw power from core HP instead of the capacitor. You can scan endlessly if you're willing to burn the core.

**Standard stats vs ACU Mk II v1 (weakest-range native sensor):**

-   Range: 3.5 vs 4.0 (worse at v1, catches up at v3)
-   Chance: 0.45 vs 0.90 (far worse accuracy)
-   Survey: 1.80x vs 0.42x (far slower)
-   Draw: 0.5 vs 1.0 (lower — barely touches power bus)
-   Footprint: 20 vs 15 (bigger)

**DSP affinity:** Reads core harmonics, not EM spectrum. Worst active detection in the game (0.50-0.55), worst pulseGain (0.40-0.45), but above-neutral continuousGain (1.10-1.15) — excellent at detecting running warp cores specifically.

**Mechanic:** Core Resonance Scanning — scan power cost drawn from core HP instead of capacitor (1.0x cost as core damage).

### DSC Shield Mk II (`dsc_shield_mk2`)

**Manufacturer:** DSC (sensors) → builds a shield

Sensor company builds a shield using sensor array feedback loops. Paper-thin capacity, weak regen — but passive sensor range increases +40% while shields are active. The shield acts as a sensor amplifier.

**Standard stats vs Aegis Alpha Mk II v1 (weakest native shield):**

-   Capacity: 25 vs 70 (far less protection)
-   Regen: 6.0 vs 24.0 (far slower recovery)
-   Draw: 2.0 vs 3.0 (lower — power efficient)
-   Footprint: 15 vs 10 (bigger)

**DSP:** None — shields don't have DSP properties in this system.

**Mechanic:** Sensor-Shield Coupling — passive sensor range +40% while shields are active (capacity > 0).

### NPL Sensor (`npl_sensor_mk2`)

**Manufacturer:** Null Point Labs (stealth systems) → builds a sensor

Stealth company builds a sensor optimized for detecting what others are trying to hide. Years of EM warfare research — building systems to suppress ship signatures — gave Null Point an intimate understanding of what betrays a ship: drive harmonics, shield cycling patterns, weapon discharge residuals. The NPL sensor listens for exactly those things. It is useless for exploration. It is terrifying for hunting.

**Standard stats vs ACU Mk II v1 (weakest-range native sensor):**

-   Range: 3.0 vs 4.0 (worse)
-   Chance: 0.40 vs 0.90 (far worse accuracy for surveys)
-   Survey: 2.50x vs 0.42x (glacially slow — not built for this)
-   Draw: 0.8 vs 1.0 (moderate — passive-first design sips power)
-   Footprint: 20 vs 15 (bigger — antenna arrays tuned for ship-frequency EM)

**DSP affinity:** Extreme passive bias. The highest passive affinity in the game (1.80), with continuous gain to match (1.60) — it excels at picking up the sustained hum of drives, shields, and reactors. Active scanning is almost nonexistent (0.30) — Null Point doesn't believe in announcing your presence. Pulse gain is moderate (0.80) — it can catch a torpedo launch or drive spool but isn't specialized for it.

**DSP identity floors:**

-   Active cap: 0.40 (permanently terrible at active scanning — never broadcasts)
-   Pulse gain cap: 0.90 (decent but never specialist-level)
-   Passive and continuous gain: uncapped (the NPL only gets better at listening)

**Mechanic:** Passive Ship Classification — at `analysis` tier confidence (85%+), the NPL sensor identifies not just emission type but specific component signatures: drive class (DR-305/505/705), weapon type (phaser/torpedo), and shield state (capacity percentage). Standard sensors at analysis tier identify activity type; the NPL identifies the loadout.

**Integration notes:** The classification mechanic extends `classifyEmission()` in the formulas package. When the detecting sensor is NPL-type and confidence reaches analysis tier, the return data includes component-level identification pulled from the emission's spectral fingerprint. This requires drive envelope signatures and weapon emission profiles to be matchable against a known library — which the Null Point engineers built from their own suppression research.

## Mechanic Field Schema

The `mechanic` field on `WorkbenchProduct` is structured data for display and documentation:

```typescript
interface ProductMechanic {
	label: string; // "Transit Shield Harmonics"
	trigger: string; // "During jump transit (sustain phase)"
	effect: string; // "Shield regen continues at reduced rate"
	magnitude?: number; // 0.5
	unit?: string; // "x normal regen"
}
```

This is for workbench display only. When crossover mechanics are implemented in the game engine, the formulas package will need its own representation tied to the action/system that processes the mechanic.

## Integration Notes

When implementing crossover mechanics in formulas:

1. **Aegis Drive:** The jump formula needs a shield-regen check during sustain phase. If the equipped drive has the transit-shield-harmonics mechanic, apply `magnitude` as a multiplier to the shield regen rate for the transit duration.

2. **Epoch Sensor:** The scan formula needs an alternate power source path. If the equipped sensor has the core-resonance mechanic, subtract scan power cost from core HP instead of capacitor. The `draw` stat (0.5) still applies to the power bus for passive load.

3. **DSC Shield:** The passive detection formula needs a range modifier. If shields are active and the equipped shield has the sensor-coupling mechanic, multiply passive sensor range by `(1 + magnitude)`.

Each mechanic crosses system boundaries (drive affects shields, sensor affects core, shield affects sensors), which is intentional — crossovers create interesting loadout interactions that reward creative builds.
