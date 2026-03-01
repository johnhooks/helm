/**
 * Passive detection — what does my sensor hear right now?
 *
 * Passive detection isn't an action. It's a derived view. When a player
 * checks in, the system computes what their sensor would have detected
 * from the activity log. This makes passive scanning essentially free in
 * engine cost — just a query against existing state.
 *
 * The computation composes the other DSP formulas:
 *   emission → noise → SNR → integration gain → matched filter → detection probability
 *
 * The result is a confidence level (0-1) for each emission source. Not
 * identity, not precise location — just "elevated EM activity consistent
 * with [mining/scanning/combat]" at some confidence level.
 *
 * A confidence of 0.8 means the sensor is fairly sure that's a real signal.
 * A confidence of 0.3 means it could be noise. The player decides whether
 * to act on uncertain information.
 */

import type { SensorAffinity, SpectralType } from './types';
import { DEFAULT_DSP_CONSTANTS } from './types';
import { snr, maskedSNR, integrationGain } from './snr';
import { matchedFilterGain, detectionProbability } from './detection';

/**
 * A single emission source that the sensor might detect.
 */
export interface EmissionSource {
	/**
	 * Power of the emission (from tunedEmission())
	 */
	power: number;
	/**
	 * Spectral type determines which matched filter to apply
	 */
	spectralType: SpectralType;
	/**
	 * Correlated noise that masks this specific source (belt masking a miner, etc)
	 */
	maskingNoise?: number;
	/**
	 * Opaque label for the caller to identify this source in results
	 */
	label?: string;
}

/**
 * A detection result for a single emission source.
 */
export interface Detection {
	/**
	 * Confidence level 0-1 (the detection probability)
	 */
	confidence: number;
	/**
	 * The label from the source, passed through for caller convenience
	 */
	label?: string;
}

/**
 * Single-source passive detection confidence.
 *
 * Composes the full DSP pipeline for one emission source:
 * 1. Compute raw SNR (basic or masked depending on masking noise)
 * 2. Apply integration gain from accumulated observation time
 * 3. Apply matched filter gain from sensor affinity
 * 4. Run through the detection sigmoid
 *
 * Returns a confidence value 0-1.
 *
 * @param emissionPower - Power of the target emission
 * @param noiseFloorValue - Total system noise (from noiseFloor())
 * @param sensorPassiveAffinity - Sensor's passive detection multiplier
 * @param integrationSeconds - How long the sensor has been observing
 * @param samplePeriod - Seconds between passive samples (default from DSP constants)
 * @param matchedGain - Pre-computed matched filter gain (default 1.0)
 * @param maskingNoise - Correlated noise masking this signal (default 0)
 * @param pilotSkill - Pilot experience multiplier (default 1.0). Permanent,
 *   lives on the WP user. A veteran scanner (1.1) has 10% better effective
 *   sensor performance. Stacks multiplicatively with sensorPassiveAffinity.
 */
export function passiveDetection(
	emissionPower: number,
	noiseFloorValue: number,
	sensorPassiveAffinity: number,
	integrationSeconds: number,
	samplePeriod: number = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds,
	matchedGain: number = 1.0,
	maskingNoise: number = 0,
	pilotSkill: number = 1.0,
): number {
	// Step 1: effective signal power, scaled by sensor passive affinity
	// AND pilot skill. A DSC (1.4) with a veteran pilot (1.1) hears the
	// signal 54% louder than a stock VRS with a rookie.
	const effectiveSignal = emissionPower * sensorPassiveAffinity * pilotSkill;

	// Step 2: raw SNR — basic or masked
	const rawSNR = maskingNoise > 0
		? maskedSNR(effectiveSignal, noiseFloorValue, maskingNoise)
		: snr(effectiveSignal, noiseFloorValue);

	// Step 3: integration gain from accumulated observation
	const sampleCount = Math.max(1, Math.floor(integrationSeconds / samplePeriod));
	const integratedSNR = integrationGain(rawSNR, sampleCount);

	// Step 4: matched filter — sensor template correlation
	const filteredSNR = integratedSNR * matchedGain;

	// Step 5: detection probability from the sigmoid, capped.
	// Passive listening is free and silent — it should never give certainty.
	// Want 100%? Escalate to an active scan (which reveals your position).
	const raw = detectionProbability(filteredSNR);
	return Math.min(raw, DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);
}

/**
 * Multi-source passive detection — the system EM readout.
 *
 * Evaluates every emission source against the sensor and returns an array
 * of detections with confidence levels. This is the player's sense of
 * what's happening around them.
 *
 * Sources below a minimum confidence threshold are excluded from results
 * to avoid flooding the readout with noise artifacts.
 *
 * @param sources - All emission sources in the system
 * @param noiseFloorValue - Total system noise
 * @param sensorAffinity - Full sensor affinity profile
 * @param integrationSeconds - Observation time
 * @param samplePeriod - Seconds between samples (default from DSP constants)
 * @param minConfidence - Minimum confidence to include in results (default 0.1)
 */
export function passiveReport(
	sources: EmissionSource[],
	noiseFloorValue: number,
	sensorAffinity: SensorAffinity,
	integrationSeconds: number,
	samplePeriod: number = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds,
	minConfidence: number = 0.1,
): Detection[] {
	const detections: Detection[] = [];

	for (const source of sources) {
		const gain = matchedFilterGain(sensorAffinity, source.spectralType);
		const confidence = passiveDetection(
			source.power,
			noiseFloorValue,
			sensorAffinity.passive,
			integrationSeconds,
			samplePeriod,
			gain,
			source.maskingNoise ?? 0,
		);

		if (confidence >= minConfidence) {
			detections.push({
				confidence,
				label: source.label,
			});
		}
	}

	// Sort by confidence descending — strongest signals first
	detections.sort((a, b) => b.confidence - a.confidence);

	return detections;
}
