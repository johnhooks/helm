# DSP: The Scanning Engine

The scanning and detection system in Helm borrows from digital signal processing — the vocabulary, the concepts, and where the math works out, the actual formulas. But gameplay takes precedence over physics. DSP *influences* probabilities and information quality. It doesn't create binary pass/fail outcomes.

## Design Philosophy: Influence, Not Brick Walls

DSP concepts serve as inspiration and, where possible, real math. But we never let the physics override fun:

- **The sigmoid is gradual.** Detection probability transitions smoothly over a wide SNR range (steepness=0.5, ~8.8 SNR width from 10%→90%). No cliff edges where one more unit of noise makes something completely invisible.
- **Ship noise is attenuated.** Sensors do spectral filtering — they don't blindly sum every EM source. Ship emissions contribute only 30% to the noise floor (shipNoiseFactor=0.3). Busy systems are harder, not impossible.
- **Passive never gives certainty.** Passive listening is free and silent — it caps at 95% confidence (passiveConfidenceCap=0.95). Want 100%? Escalate to an active scan, which reveals your position. This preserves the cost hierarchy: free information is uncertain, certain information costs emission.
- **Equipment and experience are multipliers.** A "correlator module" doesn't literally run cross-correlation. It shifts information tier thresholds down. A "veteran sensor" doesn't literally sharpen templates. It reduces the confidence needed to classify signals. The *concept* is DSP. The *implementation* is gameplay math.
- **Two experience sources.** Pilot skill is permanent — it lives on the WP user and survives ship loss. Months of scanning build intuition. Component drift lives on the hardware and dies with the ship. A sensor used for 500 hours of passive belt scanning develops sharper templates for continuous signals. Both matter, but losing a ship hurts without being catastrophic.

### What's Real DSP vs Inspired-by-DSP

| Concept | Implementation | Notes |
|---------|---------------|-------|
| SNR (signal/noise) | Real formula | signal ÷ noise, directly used |
| Integration gain (√N) | Real formula | Averaging samples improves detection — textbook DSP |
| RMS noise combination | Real formula | Uncorrelated sources add in quadrature |
| Sigmoid detection curve | Inspired | Real detectors use Q-functions; our sigmoid captures the shape |
| Matched filter gain | Inspired | Real matched filters correlate waveforms; we use affinity multipliers |
| Spectral masking | Inspired | Real masking is frequency-domain overlap; we add correlated noise |
| Ship noise factor | Gameplay | Models "spectral filtering" but is just a 0.3× multiplier |
| Information tiers | Gameplay | Confidence→what-you-learn mapping, no DSP analog |
| Equipment modifiers | Gameplay | Shift thresholds and multiply parameters, not real filters |
| Component drift | Gameplay | Veteran bonus as threshold shift, not actual template sharpening |

The goal: a player who knows synths or signal processing recognizes the vocabulary. A player who doesn't just sees "better equipment = detect more." Both experiences are valid.

## Why This Matters

Scanning is the most important system in the game. Everything depends on it:

- **Discovery.** Finding resources, planets, anomalies, wrecks — all scanning.
- **PVP.** Finding targets, detecting hunters, running from predators — all scanning.
- **Hiding.** Minimizing your signal presence so scanning doesn't find you — anti-scanning.
- **Electronic warfare.** Disrupting, spoofing, filtering signals — signal processing combat.

The richness of the game comes from how much depth DSP math gives us for free. Decades of signal processing research, well-understood algorithms, proven formulas. We don't have to invent game mechanics — we implement signal processing and the mechanics emerge.

## The Signal Chain

Every detection computation runs through the same pipeline:

```
Source Signal (emissions from ship actions)
        ↓
    Channel (space between source and detector)
        ↓
    Environment Noise (stellar baseline + random events + other ships)
        ↓
    ECM Noise (intentional jamming, if present)
        ↓
    Belt/Terrain Masking (natural noise sources that correlate with target signal)
        ↓
    Receiver (the detecting ship's sensor)
        ↓
    Signal Processor Addon (if equipped — filter modification)
        ↓
    Integration (accumulate signal over time)
        ↓
    Threshold Detection (signal resolved? contact detected?)
```

This is a standard DSP receive chain. The game engine runs it at every checkpoint.

## Core DSP Concepts Mapped to Gameplay

### Signal-to-Noise Ratio (SNR)

The fundamental quantity. Detection probability is a function of SNR — how much the target's signal stands out from the noise.

```
SNR = signalPower / noisePower
detectionProbability = f(SNR, integrationTime, sensorCharacteristics)
```

High SNR → easy to detect. A PNP scan in a quiet system is a bright signal against a dark background.

Low SNR → hard to detect. A miner in a dense asteroid belt is a dim signal buried in correlated noise.

SNR changes constantly. Ships start and stop actions, storms come and go, ECM activates. The electromagnetic environment is dynamic, and every detection computation uses the current SNR.

### Integration Time

Passive detection accumulates signal over time. Weak signals that are invisible in a single sample become detectable after enough integration — the noise averages out, the signal builds.

```
integratedSNR = instantSNR × √(integrationTime / samplePeriod)
```

This is why passive belt scanning takes hours. The miner's signal is weak against the belt noise. But it's consistent — the same emission pattern, repeated. Over hours of integration, the pattern emerges from the noise. A single sample says "maybe noise." A thousand samples say "that's a mining laser."

The DSC sensor's long dwell time is literally a longer integration window. It's why the DSC is better at passive detection — it integrates more signal per sweep.

### Matched Filtering

The detector knows what ship signatures look like. Mining emissions have a characteristic pattern. Drive spools have a characteristic pattern. PNP scans have a characteristic pattern. The sensor correlates incoming signal against known templates.

```
correlationScore = ∫ receivedSignal(t) × template(t) dt
```

A high correlation score against the "mining operation" template means "that's probably a miner." A high correlation against the "PNP scan" template means "someone is hunting."

This is where sensor affinity comes from:

- **ACU** has strong templates for high-frequency, repetitive signals. Good at matching active scan patterns and regular mining cycles. Poor templates for slow, infrequent signals.
- **DSC** has strong templates for weak, extended signals. Good at matching faint drive residuals and long-duration passive emissions. Poor at rapidly identifying strong, obvious contacts.
- **VRS** has moderate templates across the board.

The signal processor addon modifies these templates. The correlator sharpens the passive templates. The amplifier sharpens the active templates.

### Spectral Masking

A signal that occupies the same frequency band as a noise source is harder to detect. The noise "masks" the signal — the detector can't separate them.

```
effectiveSNR = signalPower / (noiseFloor + maskingNoise)
```

This is why miners in asteroid belts are hard to find. Mining emissions and belt noise occupy overlapping spectral bands — thermal signatures, metallic reflections, electromagnetic pulses from impacts. The belt's natural emissions spectrally mask the mining operations.

A ship in open space has no masking. Their emissions stand alone against the stellar background. Easy to detect.

A ship during a siege benefits from masking too — combat emissions from dozens of ships create broadband noise that masks the vulture's salvage emissions.

### Cross-Interference

A ship's own emissions interfere with its sensors. This isn't a special game rule — it's how signal processing works. Your own drive spool produces electromagnetic noise that your sensor has to filter out.

```
effectiveSensorSNR = targetSignal / (environmentNoise + ownEmissions)
```

This is why scanning during drive cooldown is degraded. The drive's residual emissions add to the noise your sensor is processing. The sensor can't distinguish distant signals from its own ship's output.

A ship running ECM degrades its own scanning too — the ECM noise is omnidirectional. You're jamming yourself as much as the enemy, unless your ECCM can filter your own ECM signal (which is possible because you know your own ECM parameters — this is self-interference cancellation, a real DSP technique).

### Pulse Detection vs Continuous Detection

Two detection modes for two types of signals:

**Pulse detection** for transient events — drive spool spikes, PNP sweep peaks, weapons fire. These are short, high-energy events. Detection is about catching the pulse: were you listening when it happened? High instantaneous SNR but brief window.

**Continuous detection** for sustained activity — mining, salvaging, shield regen, sustained drive operation. These are steady, low-energy signals. Detection is about integration: accumulate enough samples to pull the signal from noise.

The ACU's rapid sweep style is optimized for pulse detection — it samples frequently, catching transient events. The DSC's long dwell is optimized for continuous detection — it integrates deeply, finding sustained operations.

### Drive Signatures and the Oscillator-Envelope Model

The drive isn't a static emission source — it's an oscillator shaped by an envelope. The synth model applies directly.

**The oscillator** is the drive's fundamental EM pattern. Each drive model has a characteristic waveform — the DR-305's gentle hum sounds nothing like the DR-705's aggressive roar. This is the drive's "voice" in the EM spectrum.

**The envelope** shapes the oscillator's amplitude through the jump lifecycle:

- **Spool (Attack)** — The oscillator ramps up as the drive field forms. Frequency rises from low to operating pitch. This frequency sweep is a **chirp** — a signal that cuts across the spectrum in a short window. Chirps are extremely distinctive in DSP terms because they're broadband energy in a compressed timeframe. This is why spool reads as a pulse to sensors. Happens in the **origin** system — the ship is still here, lighting up every sensor.

- **Sustain** — The oscillator locks to its operating frequency. Steady, narrow-band, continuous. The envelope holds flat. This phase happens during transit — neither origin nor destination system sees it (the ship is in warp).

- **Cooldown (Release)** — The oscillator frequency drops back down as the drive field collapses. Reverse chirp, decaying amplitude. Happens in the **destination** system — a ship just arrived and its drive is winding down.

The emission at any moment is `oscillator(t) × envelope(t)`. The three emission profiles (`drive_spool` at 4.0, `drive_sustain` at 2.0, `drive_cooldown` at 1.5) are flat snapshots of this product at each phase. When the envelope system is implemented, these become continuous functions.

**Each drive model has a different oscillator AND envelope shape:**

- **DR-305 (Civilian)** — 3-minute spool, 2-minute cooldown. Narrow frequency sweep, low operating frequency, soft attack, quick release. Quiet, unassuming. Hard to distinguish from background noise.
- **DR-505 (Industrial)** — 4-minute spool, 3-minute cooldown. Big ship, long vulnerability window — but compensates with heavier hull. Moderate sweep, moderate frequency, balanced envelope.
- **DR-705 (Military)** — 2-minute spool, 2.5-minute cooldown. Fast combat-optimized drive. Wide frequency sweep, high operating frequency, sharp attack, arrives hot. Screams across the spectrum. Unmistakable signature.

**This is what makes matched filtering powerful.** The sensor isn't just detecting "energy" — it's correlating against a known chirp pattern. The frequency sweep rate is a fingerprint. An ACU with strong pulse gain (1.5) locks onto the sharp spool chirp. A DSC with strong continuous gain (1.5) picks up the sustained hum and the long cooldown tail. The spectral type isn't an inherent property of the phase — it emerges from how the envelope shapes the oscillator at that moment.

### Signature Analysis and Information Hierarchy

Detection confidence is the first layer — "something is there." The real gameplay is in what the signature *tells you*. The EM characteristics carry information about the source ship.

**What signatures reveal:**

- **Emission power** — How big/hot the drive is. A DR-705 at full throttle has a completely different amplitude than a DR-305 at economy. You don't just detect "a spool" — you detect "a loud, aggressive spool."
- **Chirp pattern** — Which drive model. The frequency sweep rate is a fingerprint unique to each drive type.
- **Composite signature** — The combination of active emissions paints a picture. Spool + shield_regen + high core hum = combat configuration. Gentle spool + mining = civilian hauler heading to a belt.
- **Suppressed signatures** — A ship actively dampening its emissions. The signal is faint, narrow, deliberately quiet — but the suppression itself is information. "This ship is trying to hide."

**Information hierarchy — escalating detail at escalating cost:**

| Method | What you learn | Time | Your emission |
|--------|---------------|------|---------------|
| **Passive listening** | Indirect inference: drive class, power estimate, combat vs civilian profile. Confidence builds over hours. | Hours | Zero |
| **Active scan** | Specific facts: hull type, mass class. You're bouncing a signal off them. | Minutes | Moderate (PNP = 5.0) |
| **Deep scan** | Full readout: loadout, cargo, detailed systems. The most invasive scan type. | Fast | Massive (10.0+) |

Each level gives more information but costs more emission. The scanner becomes scannable. A deep scan is so loud that every ship in the system detects it — it's an aggressive act, equivalent to pointing a spotlight at someone in a dark room. Everyone sees the spotlight.

**Integration refines classification over time.** At 2 hours, your DSC says "drive activity detected." At 6 hours: "DR-700 class, combat configuration, shield regen active." At 12 hours: "consistent emission pattern, probably mining — not a threat." The picture sharpens. Patient observation doesn't just increase detection confidence — it refines what you know about the source. This is the core PVP mechanic: time investment converts uncertainty into actionable intelligence.

## Emission Profiles by Action

Each action produces a characteristic emission signature. These are the "source signals" in the DSP chain.

| Action | Emission Type | Strength | Spectral Character | Detectability |
|--------|--------------|----------|-------------------|---------------|
| PNP scan | Active pulse | Very high | Broadband, omnidirectional | Very easy — designed to illuminate, inherently loud |
| Active belt scan | Focused pulse | High | Directed, narrow-band | Moderate — focused beam, less omnidirectional scatter |
| System survey | Sweep | Moderate | Broadband, omnidirectional | Moderate |
| Planet scan | Focused | Low | Directed, narrow-band | Low — pointed at a planet, not broadcasting |
| Drive spool | Transient pulse | High | Distinctive EM spike | Easy — sharp, unique signature |
| Drive sustain | Continuous | Moderate | Steady EM field | Moderate — steady but distinctive |
| Drive cooldown | Decaying | Moderate→Low | Tapering EM residual | Moderate initially, fading |
| Mining | Continuous | Low-Moderate | Overlaps belt noise spectrum | Hard in belt — spectrally masked. Easy in open space |
| Salvaging | Continuous | Low-Moderate | Similar to mining | Moderate — no belt masking unless in debris field |
| Weapons fire | Transient burst | Very high | High-energy, broadband | Very easy — impossible to hide |
| ECM | Continuous | High | Intentional broadband noise | Easy to detect ECM is running — but that's the point |
| Shield regen | Continuous | Very low | Low-power EM oscillation | Very hard — nearly invisible |
| Idle | None | Zero | Nothing | Undetectable |

## Patching: Tuning Your Signal Chain

This is where the synth inspiration found its real home. Not in "the ship is a synth" — but in "the scanning engine is a DSP pipeline, and the pilot tunes it."

### What Patching Means Here

The sensor has parameters. The signal processor has parameters. The ECM/ECCM system has parameters. Together they form a signal chain with adjustable characteristics. "Patching" is configuring that chain for your current situation.

This isn't sliders or a power management screen. It's the per-action tuning (effort, priority, throttle) applied to the signal chain — but with DSP-meaningful parameters:

**Filter tuning.** Adjust what your sensor is listening for. Tuned for mining signatures? You'll find miners faster but miss drive spools. Tuned for combat signatures? You'll catch PNP scans instantly but mining ops disappear into noise. You can't listen for everything equally well.

**Integration time.** Trade speed for sensitivity. Short integration (quick answer, high noise, might miss). Long integration (slow answer, clean signal, more certain). This maps to the existing effort parameter — effort controls how long the sensor dwells.

**Bandwidth.** Narrow bandwidth focuses on a specific signal type with better SNR. Wide bandwidth catches more signal types but with worse SNR per type. The specialist vs generalist tradeoff, expressed as filter width.

**Noise rejection.** How aggressively the sensor filters noise. Aggressive filtering rejects more noise but might also reject weak true signals. Conservative filtering keeps everything, including more noise. False positives vs false negatives.

### How It Plays

The pilot doesn't think in DSP terms. They think:

- "I'm mining in a frontier belt, I want to know if someone starts PNP scanning." → Tune passive detection for pulse signatures, high bandwidth, aggressive noise rejection. They'll catch PNP scans quickly but won't detect much else.

- "I'm hunting a miner I know is in one of these belts." → Tune passive belt scan for mining signatures, narrow bandwidth, long integration. Patient, focused, quiet.

- "I'm running through a busy system and want general awareness." → Wide bandwidth, moderate integration, conservative filtering. See everything, trust nothing, keep moving.

- "I'm defending a station under siege and need to track attacker movements." → Tune for drive signatures and weapons fire, short integration (things change fast in combat), pulse detection priority.

The interface presents these as ship-appropriate choices, not DSP knobs. But under the hood, the engine is running real signal processing math with real tradeoffs.

### Drift and Signal Processing

Component drift (see `docs/plans/envelopes.md`) interacts with the signal chain. A sensor that's been doing passive belt scans for months develops drift toward that detection mode. Its matched filter templates for mining signatures get sharper. It integrates that specific signal type faster.

A sensor with combat drift has better templates for weapons fire and drive spools. It catches PNP scans faster. But its mining-signal templates are dull — it's been ignoring that spectral band.

This means two identical sensors with different usage histories produce different DSP results. The veteran hunter's sensor literally processes signals differently than the explorer's sensor. Not because of a buff number — because the matched filter templates have been shaped by what the sensor has been trained on.

## Engine Implementation

The DSP pipeline runs inside the engine layer (see `docs/plans/simulation-testing.md`). When the engine builds an `ActionContext` for a checkpoint, part of that context is the current electromagnetic environment and the ship's signal chain configuration.

### Per-Checkpoint DSP Computation

```
1. Compute environment spectrum
   - Stellar baseline (constant per system)
   - Random events (ion storm adds broadband noise)
   - All active ship emissions in system (each with spectral profile)
   - Belt noise (per belt, scales with density)
   - ECM sources (intentional noise injection)

2. For each detecting ship:
   a. Get sensor characteristics (type, affinity, drift)
   b. Get signal processor addon (if equipped)
   c. Get current tuning (filter settings, integration state)
   d. Subtract own-ship emissions (self-interference)
   e. For each emission source:
      - Compute received signal strength
      - Apply spectral masking (belt, debris, ECM)
      - Compute effective SNR
      - Apply matched filter (correlation against templates)
      - Accumulate integration (add to running integration buffer)
      - Check threshold: integrated SNR > detection threshold?
      - If yes: fire detection event with confidence level
```

### Passive Tick and the EM Snapshot Cache

Passive detection is fundamentally different from action checkpoints. An action checkpoint resolves work — a scan completes, a jump finishes, ore is extracted. Passive detection is a pure read. The sensor isn't doing anything. It's asking "what would I have heard since last time I checked?"

This means passive ticks are cheap in a way action checkpoints aren't. The computation is read-only and the inputs change infrequently. The system's electromagnetic environment — the noise floor and the set of active emission sources — only changes when a ship *does something*: starts an action, completes an action, arrives, departs. Between those events, the environment is static.

This gives us a two-layer model:

**System EM snapshot.** A cached representation of the electromagnetic environment for a system. Contains the noise floor, all active emission sources with their power and spectral type, and any environmental modifiers (belt noise, ECM, storms). The snapshot is invalidated and recomputed when any action starts, stops, or completes in the system — the events that actually change the EM landscape.

**Per-ship passive read.** When a ship's passive tick fires, it evaluates its sensor against the cached snapshot. The only per-ship inputs are sensor affinity, integration time (how long since the ship started observing), and self-interference (the ship's own emissions). This is a handful of formula evaluations per emission source — fast enough that the tick cost is dominated by scheduling, not computation.

**Tick rate as a tunable.** How often a ship checks its passive readout is a gameplay-meaningful parameter. A faster tick means more responsive awareness — you notice the PNP scan within minutes instead of an hour. But faster ticking has a cost (engine scheduling overhead, and potentially a gameplay cost like power draw or sensor wear). Sensor quality or signal processor addons could affect tick rate, making it a meaningful stat: the DSC's long dwell time might naturally produce fewer but deeper ticks, while the ACU's rapid sweep style produces frequent shallow ticks.

The cache is the real efficiency win. A system with 30 ships doesn't need 30 independent noise floor calculations every tick. It needs one snapshot, recomputed only when the environment actually changes. The per-ship evaluation against that snapshot is trivial. This scales well — even busy systems with frequent action events will have stable windows between events where the snapshot holds.

### What the Simulation Tests

The DSP engine is where simulation testing (see `docs/plans/simulation-testing.md`) becomes essential. The questions are signal processing questions:

- At what SNR does a miner in a belt become detectable with DSC passive scanning? How many hours of integration?
- What's the false positive rate when a wolf scans for miners during an ion storm?
- How much does ECM degrade PNP scan probability? At what ECM power level does PNP scanning become useless?
- If 3 wolves PNP scan simultaneously, what's the probability a miner's passive detection catches at least one of them?
- What's the optimal filter tuning for a bounty hunter tracking a specific ship signature?
- How much does a signal processor correlator addon reduce passive belt scan time?

These aren't game balance questions — they're signal processing calculations with known-correct answers. We can validate the engine against DSP theory. If the simulation produces detection probabilities that violate basic SNR theory, the implementation is wrong.

## Reference: DSP Formulas

Key formulas the engine will implement. All standard signal processing.

### Detection Probability

```
Pd = Q(Q⁻¹(Pfa) - √(2 × SNR))
```

Where `Pd` is detection probability, `Pfa` is false alarm probability, `SNR` is signal-to-noise ratio, and `Q` is the complementary cumulative distribution function. This is the Neyman-Pearson detector — the theoretically optimal threshold detector for known signals in Gaussian noise.

For gameplay purposes, a simplified sigmoid approximation works:

```
Pd = 1 / (1 + e^(-k × (SNR - threshold)))
```

Where `k` controls the steepness of the detection curve (default 0.5 — very gradual, the 10%-90% transition spans ~8.8 SNR units) and `threshold` is the minimum SNR for 50% detection probability.

The wide sigmoid is deliberate. Detection probability changes *gradually* as conditions change — no cliff edges. A PNP scan registers as ~18% confidence in a single 5-minute sample, building to ~89% over 30 minutes of sustained scanning. Awareness comes first, confidence follows.

Two thresholds serve two detection modes:

- **Active threshold (1.0)** — Per-sweep detection for active scanning. Responsive, resolves in minutes. Each sweep is an independent detection attempt; cumulative probability across N sweeps is `1 - (1-p)^N`.
- **Passive threshold (8.0)** — Integrated passive detection. High bar — requires hours of observation for moderate signals. Integration gain (√N from 5-minute sampling) builds SNR toward the threshold over time. Even with perfect conditions, passive detection caps at 95% confidence — free information is never certain.

### Integration Gain

```
SNR_integrated = SNR_single × √N
```

Where `N` is the number of integrated samples (one every 5 minutes by default, tunable from 1-10 minutes). Passive detection improves with the square root of observation time. Doubling integration time gives ~1.4x SNR improvement, not 2x. Diminishing returns that make patience valuable but not infinitely so.

**Scan frequency is a tactical choice.** A 1-minute scanner catches every drive spool (2-4 minutes) but costs more in engine ticks. A 10-minute scanner is efficient but has only a 20% chance of catching a military spool during the window. The default 5 minutes balances responsiveness with efficiency.

### Noise Floor

```
N_total = N_stellar + shipNoiseFactor × √Σ(E_ship²) + N_belt + N_ecm + N_random
```

Ship emissions combine as RMS (root-sum-of-squares), then attenuated by `shipNoiseFactor` (default 0.3). This models spectral filtering and spatial separation — your sensor doesn't blindly sum every EM source. 100 miners at emission 1.0 each produce 0.3 × √100 = 3.0 ship noise, not 100.

Environmental sources (belt noise, ECM, random events) add linearly because they represent specific, coherent effects that don't average out.

### Information Tiers

Detection confidence maps to what the sensor reveals:

| Tier | Threshold | What You Learn |
|------|-----------|---------------|
| anomaly | 0.15 | "EM activity detected, bearing 040" |
| class | 0.40 | "continuous emission — likely mining or industrial" |
| type | 0.65 | "signature consistent with DR-305 class drive" |
| analysis | 0.85 | "DR-305, spool phase, estimated power 1.2" |

Equipment bonuses (correlator modules, signal processors) and experience bonuses (component drift, veteran sensors) shift these thresholds down. A correlator (bonus=0.05) shifts anomaly from 0.15→0.10. Stacked with a veteran bonus (0.03): 0.10→0.07.

### Modifier Pipeline

All modifiers are multiplicative (1.0 = no change), feeding into existing formula parameters:

| Modifier | What It Affects | Survives Ship Loss? | Example |
|----------|----------------|--------------------|---------|
| emissionMod | tunedEmission() signal power | On hardware | Signal processor amplifier |
| sensorMod | sensorPassiveAffinity | On hardware | Sensor quality/condition |
| pilotSkill | Effective sensor affinity + tier thresholds | **Permanent (WP user)** | Veteran scanner (1.0→1.25 over months) |
| componentDrift | matchedFilterGain | On hardware | 500hr belt scanning → sharper continuous templates |
| equipmentBonus | Tier thresholds via adjustedThresholds() | On hardware | Correlator module |
| selfInterferenceMod | Own emission in noise floor | On hardware | Drive dampeners / filter module |
| environmentMod | stellarNoise() modifier | N/A | Ion storm, solar flare |

**Caps prevent god-mode stacking.** The combined ceiling for a fully-kitted elite pilot is ~65% better detection and 15% lower tier thresholds — meaningful but not omniscient. See `DSP_MODIFIER_CAPS` in `types.ts`.

### Spectral Masking

```
SNR_effective = S_target / (N_total + M_correlated)
```

Where `M_correlated` is noise that spectrally overlaps with the target signal. Belt noise masking mining emissions is correlated noise — it has the same spectral shape, making it harder to reject than uncorrelated random noise.

### Matched Filter Output

```
correlation = Σ(received[t] × template[t]) / √(Σ(template[t]²))
```

Normalized cross-correlation against a known signal template. Higher correlation means higher confidence that the received signal matches the template. Sensor drift sharpens templates for frequently-encountered signal types.

## What We Get for Free

By building detection on real DSP math:

1. **Validated formulas.** These aren't made-up game numbers. They're proven signal processing calculations. If the numbers feel wrong, we can check them against theory.

2. **Natural balance.** SNR-based detection has inherent tradeoffs that we don't have to design — they emerge from the math. Integration time vs speed. Bandwidth vs sensitivity. False positives vs false negatives.

3. **Predictable behavior.** Players (and designers) can reason about the system because it follows physical intuition. Louder signals are easier to find. More noise makes everything harder. Patient observation reveals hidden signals. This isn't arbitrary — it's how signals work.

4. **Depth without complexity.** The pilot thinks "tune for mining signatures, be patient." The engine runs matched filter correlation with spectral masking and integration gain. The surface is simple, the depth is real.

5. **Patching that makes sense.** Tuning a signal chain has real meaning. The pilot adjusting their scan parameters is doing what actual sonar operators do — configuring their signal processing for the tactical situation. It's not a game abstraction. It's the real thing, slowed down.

6. **Simulation testability.** DSP has known-correct outputs for given inputs. We can write scenarios with mathematically provable expected results. If the engine disagrees with the math, the engine is wrong.
