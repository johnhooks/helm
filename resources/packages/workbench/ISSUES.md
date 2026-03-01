# Workbench Issues

## No footprint overflow indication

If component footprints exceed `hull.internalSpace`, cargo silently goes negative. No visual indication that the loadout is invalid.

## Hull slots are all identical

All six hulls have the same `['core', 'drive', 'sensor', 'shield', 'nav']` array. The slot layout was supposed to be the differentiator (scout gets cloak, surveyor gets dual sensor, striker/specter get dual shields). The `slots` field exists but isn't used by the builder or validated.

---

## DSP Formula Review

Findings from a full review of `@helm/formulas` DSP modules. The pipeline is mathematically sound — the issues below are gaps and risks for the engine implementor.

### ENGINE: Integration assumes persistent signal

`integrationGain(SNR, sampleCount)` assumes the target signal is present during ALL samples. For sustained activities (mining, shield regen) this is correct. For transient events — a military drive spool is 2 minutes, the default sample period is 5 minutes — the signal may only be present for a fraction of the integration window.

The engine needs to gate integration on signal presence. Options:
- Track per-source signal start/stop timestamps against the sample window
- Weight each sample by signal overlap fraction
- Use `SCAN_FREQUENCY_RANGE` to model the probability of catching a transient (a 1-minute scanner catches a 2-minute spool every time; a 10-minute scanner has ~20% chance)

The formulas are correct for the "signal present" case. The engine handles absence.

### ENGINE: ECM double-counting risk

`noiseFloor()` accepts `shipEmissions` (RMS-attenuated at 0.3x) and `ecmNoise` (full linear, unattenuable). If the engine puts ECM output in both arrays, jamming noise is counted twice.

The correct split: `shipEmissions` contains incidental EM output from each ship (drive, mining, etc). `ecmNoise` contains intentional broadband jamming. The ECM module's emission signature (detectable as "someone is running ECM") goes through `shipEmissions`. The actual jamming effect goes through `ecmNoise`. Don't put the same power in both.

### ENGINE: Self-interference wiring

`passiveDetection` takes `noiseFloorValue` as a pre-computed number. The detecting ship's own emissions should be included in the noise floor (self-interference), and `selfInterferenceMod` from `DSPModifiers` should scale them before inclusion. None of this is wired — the engine must:

1. Include the detecting ship's emissions in `shipEmissions` when computing `noiseFloor()`
2. Apply `selfInterferenceMod` to the ship's own emission before adding it
3. A ship with a filter module (`selfInterferenceMod: 0.3`) contributes only 30% of its own emission as self-noise

### ENGINE: No active detection formula

`activeThreshold` (1.0) and `baseSweepCount` (6) exist as constants but no formula function consumes them. The engine needs to compose the active scan path:

1. Compute echo strength (PNP emission → target cross-section → return signal)
2. Per-sweep detection: `detectionProbability(echoSNR, activeThreshold, steepness)`
3. Cumulative across sweeps: `cumulativeDetection(perSweepChance, sweepCount)`
4. Effort scales sweep count: `sweepCount = baseSweepCount * effort`

The building blocks exist. The composition doesn't.

### ENGINE: Product DSP data not connected to formulas

Sensor JSON has per-product DSP fields (`active`, `passive`, `pulseGain`, `continuousGain`). Drive JSON has per-product envelope data (`spool/sustain/cooldown` shapes). The formula layer uses `DEFAULT_DRIVE_ENVELOPES` and `SENSOR_AFFINITIES` which are separate hardcoded constants.

The engine needs a bridge: read a sensor product's `dsp` field → construct a `SensorAffinity`. Read a drive product's `dsp` field → construct a `DriveEnvelope`. The workbench CLI commands presumably do this already; the PHP engine needs the same mapping.

### DESIGN: Military cooldown flare

The DR-705 envelope: spool(2.5) → sustain(0.8) → cooldown(1.8). Cooldown peakPower is 2.25x the sustain. When a military ship arrives, its drive emission more than doubles during cooldown. Military ships can never arrive quietly — the cooldown flare announces them.

This creates good gameplay (speed vs stealth tradeoff) but the implementor should know it's a feature, not a data entry error. The civilian drive (cooldown 0.8) is the quiet arrival option.

### DESIGN: Sweep detection is sensor-neutral

ACU and DSC have identical sweep matched-filter gain (both 1.1). Neither specialist has an edge detecting sweep-type emissions (belt scans, system surveys). Only VRS is slightly worse (1.0). If differentiation is desired, the sweep formula in `matchedFilterGain` could weight pulse vs continuous gains unevenly instead of averaging.

### VALIDATED: What works well

- **Belt masking math** — A DSC sensor needs 12+ hours to register a belt miner as an anomaly (14.5% confidence at 6h, 30% at 12h). Open-space miners are detected in ~1 hour. Real tactical difference.
- **Passive confidence cap** — 0.95 cap means passive can reach "analysis" tier (0.85) but never certainty. Active scan remains the only path to 100%.
- **Sensor differentiation** — DSC at 1 hour in open space: 41% (class tier). VRS at 1 hour: 9.4% (nothing). ACU at 2 hours passively: <50%. The affinity system produces dramatic sensor personality.
- **Integration diminishing returns** — sqrt(N) scaling means doubling observation time gives ~1.4x improvement. Patience is valuable but not infinite.
- **Modifier caps** — Fully-kitted elite pilot is ~65% better at detection with 15% lower tier thresholds. Strong but not omniscient.
- **Noise floor scaling** — RMS combination means 100 miners add 3.0 ship noise, not 100. Busy systems are harder but not brick walls.
