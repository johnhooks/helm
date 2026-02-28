# DSP: The Scanning Engine

The scanning and detection system in Helm is digital signal processing. Not a metaphor — the actual math. The formulas that compute detection probability, signal integration, noise rejection, and emission masking are DSP operations running at game-time scales instead of audio-time scales.

Audio DSP processes 44,100 samples per second. Helm DSP processes a sample every few minutes. The operations are identical.

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

Where `k` controls the steepness of the detection curve and `threshold` is the minimum SNR for 50% detection probability.

### Integration Gain

```
SNR_integrated = SNR_single × √N
```

Where `N` is the number of integrated samples. Passive detection improves with the square root of observation time. Doubling integration time gives ~1.4x SNR improvement, not 2x. Diminishing returns that make patience valuable but not infinitely so.

### Noise Floor

```
N_total = N_stellar + N_random + Σ(E_ship) + N_ecm + N_belt
```

Simple additive model. All noise sources contribute linearly to the total noise power. The engine sums them per system at each checkpoint.

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
