// Types and defaults
export type { Constants, ActionTuning } from './types';
export { DEFAULT_CONSTANTS, DEFAULT_TUNING } from './types';

// DSP types and defaults
export type { EmissionType, SpectralType, EmissionProfile, SensorAffinity, DSPConstants } from './types';
export type { EnvelopePhaseShape, DriveEnvelope } from './types';
export type { InformationTier, TierThresholds, DSPModifiers } from './types';
export { DEFAULT_EMISSION_PROFILES, DEFAULT_DSP_CONSTANTS, SENSOR_AFFINITIES, DEFAULT_DRIVE_ENVELOPES } from './types';
export { DEFAULT_TIER_THRESHOLDS, DSP_MODIFIER_CAPS, SCAN_FREQUENCY_RANGE } from './types';

// Power
export { coreOutput, regenRate, perfRatio, capacitor } from './power';

// Jump
export { strainFactor, jumpComfortRange, jumpDuration, jumpCoreCost, jumpPowerCost } from './jump';

// Scan
export { scanComfortRange, scanPowerCost, scanDuration, scanSuccessChance } from './scan';

// Shield
export { shieldRegenRate, shieldDraw, shieldTimeToFull } from './shield';

// Nav
export { discoveryProbability } from './nav';

// DSP — Emission
export { emissionPower, tunedEmission } from './emission';

// DSP — Noise
export { stellarNoise, noiseFloor } from './noise';

// DSP — SNR
export { snr, maskedSNR, integrationGain } from './snr';

// DSP — Detection
export { detectionProbability, cumulativeDetection, matchedFilterGain } from './detection';

// DSP — Passive
export type { EmissionSource, Detection } from './passive';
export { passiveDetection, passiveReport } from './passive';

// DSP — Envelope
export type { EnvelopeState } from './envelope';
export { envelopeAt, envelopeDuration, envelopeTimeSeries, envelopePeakPower } from './envelope';
export { phaseEmission, envelopeEmission } from './envelope';

// DSP — Signature Analysis
export { invertSigmoid, estimateEmissionPower, classifyEmission } from './signature';

// DSP — Classification (information tiers)
export { informationTier, adjustedThresholds } from './classification';

// Mechanics — cross-system Mk II effects
export { transitShieldRegenRate, transitShieldRecovered, coreResonanceCost, sensorShieldCouplingMultiplier } from './mechanics';

// Weapons
export {
	phaserDraw, phaserShieldDrain, phaserHullDamage,
	torpedoHitChance, torpedoDamage,
	pdsInterception, ecmLockDegradation,
	shieldAbsorption,
} from './weapon';
