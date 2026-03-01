export interface ActionTuning {
	effort: number;
	throttle: number;
	priority: number;
}

export const DEFAULT_TUNING: ActionTuning = {
	effort: 1.0,
	throttle: 1.0,
	priority: 1.0,
};

export interface Constants {
	baseScanPowerPerLy: number;
	baseScanSecondsPerLy: number;
	baseJumpSecondsPerLy: number;
	baseJumpPowerPerLy: number;
	hopDecayFactor: number;
}

export const DEFAULT_CONSTANTS: Constants = {
	baseScanPowerPerLy: 2.0,
	baseScanSecondsPerLy: 30,
	baseJumpSecondsPerLy: 3600,
	baseJumpPowerPerLy: 8.0,
	hopDecayFactor: 0.9,
};

// ---------------------------------------------------------------------------
// DSP — Scanning & Detection
// ---------------------------------------------------------------------------

/**
 * Every ship action that produces electromagnetic emissions.
 * Idle ships emit nothing. Everything else is a signal source.
 */
export type EmissionType =
	| 'pnp_scan'
	| 'pvp_scan'
	| 'belt_scan'
	| 'system_survey'
	| 'planet_scan'
	| 'drive_spool'
	| 'drive_sustain'
	| 'drive_cooldown'
	| 'mining'
	| 'salvaging'
	| 'weapons_fire'
	| 'ecm'
	| 'shield_regen'
	| 'idle';

/**
 * How an emission presents in the EM spectrum.
 *
 * - pulse: short, high-energy burst (drive spool, PNP sweep peak, weapons fire)
 * - continuous: steady, sustained emission (mining, salvaging, shield regen, ECM)
 * - sweep: repeated broadband passes (system survey, belt scan)
 */
export type SpectralType = 'pulse' | 'continuous' | 'sweep';

/**
 * Characterizes an emission source — base power and spectral shape.
 * Used by the DSP pipeline to compute received signal strength and
 * choose the right matched filter template.
 */
export interface EmissionProfile {
	base: number;
	spectralType: SpectralType;
}

/**
 * Sensor detection characteristics for the DSP pipeline.
 *
 * - active/passive: overall affinity multipliers for active scans vs listening
 * - pulseGain: matched filter gain against pulse-type emissions (ACU excels)
 * - continuousGain: matched filter gain against continuous emissions (DSC excels)
 */
export interface SensorAffinity {
	active: number;
	passive: number;
	pulseGain: number;
	continuousGain: number;
	pvpGain: number;
}

/**
 * Tunable constants for the detection sigmoid and integration model.
 */
export interface DSPConstants {
	/**
	 * SNR value at which passive detection probability = 50%
	 */
	detectionThreshold: number;
	/**
	 * SNR value at which active (per-sweep) detection probability = 50%
	 */
	activeThreshold: number;
	/**
	 * Steepness of the sigmoid detection curve
	 */
	detectionSteepness: number;
	/**
	 * Seconds between passive observation samples
	 */
	samplePeriodSeconds: number;
	/**
	 * Default number of sweeps for an active scan action
	 */
	baseSweepCount: number;
	/**
	 * Attenuation factor for ship emissions in the noise floor (0-1)
	 */
	shipNoiseFactor: number;
	/**
	 * Maximum passive detection confidence (0-1). Passive listening is free
	 *  and silent — it should never give certainty. Want 100%? Use active scan.
	 */
	passiveConfidenceCap: number;
	/**
	 * Power cost per PVP scan action (capacitor units).
	 * PVP scanning is expensive — a few scans can drain the capacitor.
	 */
	pvpScanPowerCost: number;
	/**
	 * Number of sweeps per PVP scan action. Fewer than PNP (focused burst).
	 */
	pvpSweepsPerScan: number;
	/**
	 * SNR threshold for PVP detection (higher bar than regular active).
	 * Finding a specific ship for targeting lock is harder than detecting
	 * "something is out there".
	 */
	pvpDetectionThreshold: number;
	/**
	 * Duration of a PVP scan action in seconds. Not instant — gives the
	 * target time to detect the ping and react. Creates the "race" mechanic.
	 */
	pvpScanDurationSeconds: number;
	/**
	 * Base time in seconds to acquire weapons lock after detection.
	 * Actual lock time = baseLockSeconds / pvpGain.
	 * ACU (1.5) locks in ~87s. DSC (0.4) locks in ~325s.
	 * This creates the "race" — DSC detects first but locks slow,
	 * ACU detects later but locks fast.
	 */
	baseLockSeconds: number;
	/**
	 * Hull damage multiplier when phasers hit bare hull (no shields).
	 * Shields absorb/dissipate phaser energy efficiently; bare hull
	 * takes full thermal impact. drainRate × mult = hull damage/hr.
	 */
	phaserHullDamageMult: number;
	/**
	 * Torpedo flight time in seconds from launch to impact.
	 * Creates a window for the target to kill the attacker before
	 * torpedoes arrive — the core of the Striker vs Specter race.
	 */
	torpedoFlightSeconds: number;
}

// ---------------------------------------------------------------------------
// Drive Envelopes — ADSR-like power curves for drive emissions
// ---------------------------------------------------------------------------

/**
 * Shape of one phase of the drive envelope (power curve model).
 */
export interface EnvelopePhaseShape {
	duration: number;     // seconds
	peakPower: number;    // relative to drive's base emission
	curve: number;        // <1 aggressive (front-loaded), =1 linear, >1 gentle (back-loaded)
}

/**
 * Full drive envelope — 3 phases.
 */
export interface DriveEnvelope {
	label: string;
	spool: EnvelopePhaseShape;    // attack — chirp, broadband burst
	sustain: EnvelopePhaseShape;  // steady-state cruise emission
	cooldown: EnvelopePhaseShape; // release — reverse chirp
}

// -- Defaults ----------------------------------------------------------------

/**
 * Emission profiles from the DSP design doc (docs/dev/dsp.md).
 * Values are relative power levels — absolute calibration happens during
 * engine integration. Here we capture the *ratios* so formulas can be
 * tested and tuned in the workbench.
 *
 * Scale: 0 = silent, 1.0 = moderate reference level.
 */
export const DEFAULT_EMISSION_PROFILES: Record<EmissionType, EmissionProfile> = {
	pnp_scan:       { base: 5.0,  spectralType: 'pulse' },
	pvp_scan:       { base: 8.0,  spectralType: 'pulse' },
	belt_scan:      { base: 3.0,  spectralType: 'sweep' },
	system_survey:  { base: 2.0,  spectralType: 'sweep' },
	planet_scan:    { base: 0.8,  spectralType: 'sweep' },
	drive_spool:    { base: 4.0,  spectralType: 'pulse' },
	drive_sustain:  { base: 2.0,  spectralType: 'continuous' },
	drive_cooldown: { base: 1.5,  spectralType: 'continuous' },
	mining:         { base: 1.0,  spectralType: 'continuous' },
	salvaging:      { base: 1.0,  spectralType: 'continuous' },
	weapons_fire:   { base: 6.0,  spectralType: 'pulse' },
	ecm:            { base: 3.5,  spectralType: 'continuous' },
	shield_regen:   { base: 0.2,  spectralType: 'continuous' },
	idle:           { base: 0.0,  spectralType: 'continuous' },
};

export const DEFAULT_DSP_CONSTANTS: DSPConstants = {
	detectionThreshold: 6.0,    // passive: integration builds toward it over hours
	activeThreshold: 1.0,       // active: per-sweep detection stays responsive
	detectionSteepness: 0.5,    // very gradual sigmoid — wide transition zone (10%-90% spans ~8.8 SNR)
	samplePeriodSeconds: 300,   // 5 minutes between passive samples (tunable 1-10 min)
	baseSweepCount: 6,
	shipNoiseFactor: 0.3,       // spectral filtering, spatial separation, matched filter rejection
	passiveConfidenceCap: 0.95, // passive is free — never gives certainty
	pvpScanPowerCost: 15,       // ~7 scans before dry on standard capacitor
	pvpSweepsPerScan: 2,        // focused burst — fewer than PNP's 6
	pvpDetectionThreshold: 3.0, // harder than active (1.0) — targeting lock, not just detection
	pvpScanDurationSeconds: 120, // 2 minutes per scan — target has time to react
	baseLockSeconds: 130,       // lock time = 130 / pvpGain. ACU: ~87s, DSC: ~325s.
	phaserHullDamageMult: 40,   // bare hull: 35/hr drain × 40 = 1400/hr = ~23/min. Kills 60-hull Specter in ~154s.
	torpedoFlightSeconds: 120,  // 2 minutes flight time — Striker has a window to kill before torpedoes arrive.
};

/**
 * Scan frequency range — how fast the sensor samples.
 *
 * Higher frequency catches transient events (drive spools) but costs more
 * in engine ticks. Lower frequency is efficient but may miss brief signals.
 *
 * A 1-minute scanner catches a 2-minute military spool every time.
 * A 10-minute scanner has a ~20% chance of catching it during the window.
 */
export const SCAN_FREQUENCY_RANGE = {
	minSeconds: 60,     // 1 minute — maximum scan rate
	maxSeconds: 600,    // 10 minutes — minimum scan rate
	defaultSeconds: 300, // 5 minutes — balanced default
} as const;

/**
 * Drive envelope presets — one per drive class.
 *
 * Spool durations are minutes, not seconds. This matters for passive
 * detection — a 2-minute military spool is catchable by a 1-minute
 * scanner but might slip past a 10-minute one. Bigger ships have
 * longer spools (more vulnerable) but compensate with heavier hulls.
 *
 * DR-305 (civilian): moderate warmup, clean sustain, quick fade.
 * DR-505 (industrial): long heavy spool, hot sustain, slow cooldown.
 * DR-705 (military): fast brutal spool, quiet sustain, hot sharp cooldown.
 */
export const DEFAULT_DRIVE_ENVELOPES: Record<string, DriveEnvelope> = {
	'dr-305': {
		label: 'DR-305 (civilian)',
		spool:    { duration: 180, peakPower: 1.2, curve: 1.5 },   // 3 min — moderate
		sustain:  { duration: 1,   peakPower: 1.0, curve: 1.0 },
		cooldown: { duration: 120, peakPower: 0.8, curve: 0.8 },   // 2 min — cools fast
	},
	'dr-505': {
		label: 'DR-505 (industrial)',
		spool:    { duration: 240, peakPower: 1.5, curve: 1.0 },   // 4 min — big ship, long window
		sustain:  { duration: 1,   peakPower: 1.2, curve: 1.0 },
		cooldown: { duration: 180, peakPower: 1.0, curve: 1.2 },   // 3 min — heavy machinery settles slow
	},
	'dr-705': {
		label: 'DR-705 (military)',
		spool:    { duration: 120, peakPower: 2.5, curve: 0.5 },   // 2 min — fast, combat-optimized
		sustain:  { duration: 1,   peakPower: 0.8, curve: 1.0 },
		cooldown: { duration: 150, peakPower: 1.8, curve: 0.6 },   // 2.5 min — arrives hot
	},
};

/**
 * Sensor affinity presets — one per sensor class.
 *
 * ACU: aggressive hunter. High active affinity, strong pulse matched filter, best PVP scanner.
 * VRS: balanced generalist. Moderate across the board, decent PVP.
 * DSC: patient listener. High passive affinity, strong continuous matched filter, poor PVP.
 */
export const SENSOR_AFFINITIES: Record<string, SensorAffinity> = {
	acu: { active: 1.4, passive: 0.6, pulseGain: 1.5, continuousGain: 0.7, pvpGain: 1.5 },
	vrs: { active: 1.0, passive: 1.0, pulseGain: 1.0, continuousGain: 1.0, pvpGain: 0.8 },
	dsc: { active: 0.7, passive: 1.4, pulseGain: 0.7, continuousGain: 1.5, pvpGain: 0.4 },
};

// ---------------------------------------------------------------------------
// Information Tiers — what does confidence reveal?
// ---------------------------------------------------------------------------

/**
 * What a sensor can resolve depends on detection confidence.
 *
 * - anomaly: "EM activity detected, bearing 040"
 * - class: "continuous emission — likely mining or industrial"
 * - type: "signature consistent with DR-305 class drive"
 * - analysis: "DR-305, spool phase, estimated power 1.2"
 */
export type InformationTier = 'anomaly' | 'class' | 'type' | 'analysis';

/**
 * Confidence thresholds for each information tier.
 */
export interface TierThresholds {
	anomaly: number;
	class: number;
	type: number;
	analysis: number;
}

export const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
	anomaly: 0.15,
	class: 0.40,
	type: 0.65,
	analysis: 0.85,
};

// ---------------------------------------------------------------------------
// DSP Modifiers — where equipment/experience/environment plug in
// ---------------------------------------------------------------------------

/**
 * Documents where modifiers feed into the DSP pipeline. All multiplicative
 * (1.0 = no change). The engine layer applies these — the formula layer
 * accepts them as parameters to existing functions.
 *
 * Two experience sources:
 * - pilotSkill: permanent, lives on the WP user. Months of scanning build
 *   intuition that survives ship loss. Multiplies into sensorPassiveAffinity
 *   AND shifts tier thresholds (via adjustedThresholds experienceBonus).
 * - componentDrift: lives on the hardware, dies with the ship. A sensor
 *   used for 500 hours of passive belt scanning develops sharper templates
 *   for continuous signals. Multiplies into matchedFilterGain.
 *
 * Equipment:
 * - emissionMod → tunedEmission(base, mod) — signal processor amplifier
 * - sensorMod → multiplied into sensorPassiveAffinity — sensor quality/condition
 * - equipmentBonus → shifts tier thresholds via adjustedThresholds()
 * - selfInterferenceMod → scales own emission before adding to noise (filter module)
 * - environmentMod → stellarNoise(class, mod) — ion storms, solar flares
 */
export interface DSPModifiers {
	/**
	 * Signal processor: amplifier/filter on emission power
	 */
	emissionMod: number;
	/**
	 * Sensor quality/condition: multiplied into passive affinity
	 */
	sensorMod: number;
	/**
	 * Pilot skill: permanent, on WP user. Boosts effective sensor affinity
	 */
	pilotSkill: number;
	/**
	 * Component drift: on hardware, dies with ship. Boosts matched filter gain
	 */
	componentDrift: number;
	/**
	 * Equipment bonus: shifts tier thresholds down (correlator module etc)
	 */
	equipmentBonus: number;
	/**
	 * Filter module: scales own emission before adding to noise
	 */
	selfInterferenceMod: number;
	/**
	 * Ion storms, solar flares: multiplied into stellar noise
	 */
	environmentMod: number;
}

/**
 * Caps for DSP modifiers — prevents god-mode stacking.
 *
 * Each modifier is multiplicative with the others, so the COMBINED effect
 * matters more than any single cap. The ceiling is designed so that a
 * fully-kitted elite pilot is meaningfully better than a rookie, but
 * can't trivialize detection.
 *
 * Combined ceiling example (all maxed):
 *   effective = base × pilotSkill × sensorMod × componentDrift
 *            = base × 1.25       × 1.15      × 1.15
 *            = base × 1.653
 *
 * Plus tier threshold shift: equipmentBonus(0.10) + pilotSkill experience(0.05)
 * shifts anomaly from 0.15 → 0.00, analysis from 0.85 → 0.70.
 *
 * This means an elite setup is ~65% more effective at detection and reads
 * information from 15% less confidence. Strong but not omniscient.
 */
export const DSP_MODIFIER_CAPS = {
	/**
	 * Pilot skill: 1.0 (rookie) to 1.25 (elite). Months of play.
	 */
	pilotSkill: { min: 1.0, max: 1.25 },
	/**
	 * Component drift: 1.0 (new) to 1.15 (500+ hours on one signal type)
	 */
	componentDrift: { min: 1.0, max: 1.15 },
	/**
	 * Sensor condition: 0.85 (damaged) to 1.15 (pristine + upgraded)
	 */
	sensorMod: { min: 0.85, max: 1.15 },
	/**
	 * Equipment tier threshold bonus: 0 to 0.10 (best correlator)
	 */
	equipmentBonus: { min: 0, max: 0.10 },
	/**
	 * Filter module self-interference reduction: 1.0 (none) to 0.3 (best filter)
	 */
	selfInterferenceMod: { min: 0.3, max: 1.0 },
} as const;
