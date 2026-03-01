/**
 * Signature analysis formulas — what can you learn from passive observation?
 *
 * Passive observation reveals information about ships over time. By inverting
 * the detection sigmoid, a sensor can estimate source emission power from
 * observed confidence, then classify what kind of activity that power level
 * matches.
 *
 * This evolves the DSP system from "can you detect something?" to "what can
 * you learn about it?"
 */

import type { EmissionProfile } from './types';
import { DEFAULT_DSP_CONSTANTS, DEFAULT_EMISSION_PROFILES } from './types';

/**
 * Algebraic inverse of detectionProbability().
 *
 * Given a detection confidence, recover the SNR that produced it:
 *   SNR = threshold - ln((1 / confidence) - 1) / steepness
 *
 * This is the forensic analysis primitive — "if my sensor is 70% confident,
 * what SNR does that imply?"
 *
 * @param confidence - Detection probability (0-1)
 * @param threshold - SNR at 50% detection (default from DSP constants)
 * @param steepness - Sigmoid steepness (default from DSP constants)
 */
export function invertSigmoid(
	confidence: number,
	threshold: number = DEFAULT_DSP_CONSTANTS.detectionThreshold,
	steepness: number = DEFAULT_DSP_CONSTANTS.detectionSteepness,
): number {
	if (confidence <= 0) {
		return 0;
	}
	if (confidence >= 1) {
		return Infinity;
	}
	return threshold - Math.log(1 / confidence - 1) / steepness;
}

/**
 * Estimate source emission power from observation parameters.
 *
 * Inverts the full passive pipeline:
 * 1. invertSigmoid -> integrated SNR
 * 2. Undo matched filter gain -> raw integrated SNR
 * 3. Undo integration gain (/ sqrt(N)) -> instantaneous SNR
 * 4. SNR * (noiseFloor + maskingNoise) -> effective signal
 * 5. / passiveAffinity -> estimated source power
 *
 * This is the "what am I looking at?" formula.
 *
 * @param confidence - Observed detection confidence (0-1)
 * @param noiseFloorValue - Total system noise
 * @param passiveAffinity - Sensor's passive detection multiplier
 * @param integrationSeconds - How long the sensor has been observing
 * @param samplePeriod - Seconds between passive samples
 * @param matchedGain - Pre-computed matched filter gain
 * @param maskingNoise - Correlated noise masking this signal
 * @param pilotSkill - Pilot experience multiplier (default 1.0)
 */
export function estimateEmissionPower(
	confidence: number,
	noiseFloorValue: number,
	passiveAffinity: number,
	integrationSeconds: number,
	samplePeriod: number = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds,
	matchedGain: number = 1.0,
	maskingNoise: number = 0,
	pilotSkill: number = 1.0,
): number {
	// Step 1: recover integrated+filtered SNR from confidence
	const integratedSNR = invertSigmoid(confidence);

	// Step 2: undo matched filter gain
	const rawIntegratedSNR = matchedGain > 0 ? integratedSNR / matchedGain : integratedSNR;

	// Step 3: undo integration gain (/ sqrt(N))
	const sampleCount = Math.max(1, Math.floor(integrationSeconds / samplePeriod));
	const instantSNR = rawIntegratedSNR / Math.sqrt(sampleCount);

	// Step 4: SNR * total noise = effective signal
	const totalNoise = noiseFloorValue + maskingNoise;
	const effectiveSignal = instantSNR * totalNoise;

	// Step 5: undo passive affinity and pilot skill
	const divisor = passiveAffinity * pilotSkill;
	return divisor > 0 ? effectiveSignal / divisor : effectiveSignal;
}

/**
 * Classify an estimated emission power against known profiles.
 *
 * Compares the estimated power against each emission profile's base power.
 * Returns all profiles sorted by absolute distance (closest match first).
 * Ties are broken alphabetically.
 *
 * @param estimatedPower - Estimated source power (from estimateEmissionPower)
 * @param profiles - Known emission profiles to compare against
 */
export function classifyEmission(
	estimatedPower: number,
	profiles: Record<string, EmissionProfile> = DEFAULT_EMISSION_PROFILES,
): Array<{ type: string; distance: number }> {
	const results = Object.entries(profiles).map(([type, profile]) => ({
		type,
		distance: Math.abs(estimatedPower - profile.base),
	}));

	results.sort((a, b) => {
		const diff = a.distance - b.distance;
		if (diff !== 0) {
			return diff;
		}
		return a.type.localeCompare(b.type);
	});

	return results;
}
