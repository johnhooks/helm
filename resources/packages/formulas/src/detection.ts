/**
 * Detection formulas — converting SNR into gameplay outcomes.
 *
 * This is where the DSP math meets player experience. SNR is a continuous
 * quantity; detection is a binary event (found or not found). These formulas
 * bridge that gap.
 *
 * The detection probability sigmoid creates a natural threshold behavior:
 * - Below threshold SNR: detection is nearly impossible. The signal is
 *   indistinguishable from noise. You can stare at static all day.
 * - Around threshold: it's a coin flip. Maybe you see it, maybe not.
 *   Sensor quality and patience start to matter.
 * - Above threshold: detection is nearly certain. The signal is obvious.
 *   Only question is how quickly you resolve it.
 *
 * This models real radar/sonar detection curves. The steepness parameter
 * controls how sharp the transition is — steeper means a harder threshold,
 * shallower means a more gradual transition from "can't see it" to "obvious."
 */

import type { SpectralType, SensorAffinity } from './types';
import { DEFAULT_DSP_CONSTANTS } from './types';

/**
 * Sigmoid detection curve.
 *
 * Pd = 1 / (1 + e^(-k × (SNR - threshold)))
 *
 * This is the simplified Neyman-Pearson detector. The full version uses
 * the Q-function and false alarm probability, but for gameplay the sigmoid
 * captures the essential behavior: a smooth transition from "undetectable"
 * to "certain" centered on the threshold SNR.
 *
 * @param snrValue - Signal-to-noise ratio (from snr/maskedSNR/integrationGain)
 * @param threshold - SNR at which detection probability = 50% (default from DSP constants)
 * @param steepness - How sharp the transition is (default from DSP constants)
 */
export function detectionProbability(
	snrValue: number,
	threshold: number = DEFAULT_DSP_CONSTANTS.detectionThreshold,
	steepness: number = DEFAULT_DSP_CONSTANTS.detectionSteepness
): number {
	return 1 / (1 + Math.exp(-steepness * (snrValue - threshold)));
}

/**
 * Cumulative detection probability across multiple independent sweeps.
 *
 * Each sweep is an independent detection attempt — the active scan model.
 * The cumulative probability of detecting at least once in N sweeps is:
 *
 *   P = 1 - (1 - p)^n
 *
 * This is why effort matters for active scans. More sweeps (higher effort)
 * means more chances. Even a low per-sweep probability accumulates:
 * - 10% per sweep × 1 sweep  = 10%
 * - 10% per sweep × 6 sweeps = 47%
 * - 10% per sweep × 20 sweeps = 88%
 *
 * @param perSweepChance - Detection probability for a single sweep (0-1)
 * @param sweepCount - Number of independent sweeps
 */
export function cumulativeDetection(
	perSweepChance: number,
	sweepCount: number
): number {
	if (sweepCount <= 0) {
		return 0;
	}
	const clamped = Math.max(0, Math.min(1, perSweepChance));
	return 1 - Math.pow(1 - clamped, sweepCount);
}

/**
 * Matched filter gain — how well does this sensor correlate with this signal?
 *
 * In real DSP, the matched filter is the optimal detector for a known signal
 * in white noise. It works by correlating the received signal against a
 * template of what you're looking for. Higher correlation = higher effective SNR.
 *
 * Each sensor type has templates tuned to different emission shapes:
 * - ACU excels at pulse/repetitive signals (PNP scans, weapons fire, drive spools)
 * - DSC excels at faint/continuous signals (mining, salvaging, shield regen)
 * - VRS is balanced — moderate correlation with everything
 *
 * Sweep-type emissions (system survey, belt scan) use the average of pulse
 * and continuous gains — they have characteristics of both.
 *
 * Returns an SNR multiplier. Apply to the SNR before the detection sigmoid.
 *
 * @param affinity - Sensor affinity profile (from SENSOR_AFFINITIES)
 * @param spectralType - The emission's spectral character
 */
export function matchedFilterGain(
	affinity: SensorAffinity,
	spectralType: SpectralType
): number {
	switch (spectralType) {
		case 'pulse':
			return affinity.pulseGain;
		case 'continuous':
			return affinity.continuousGain;
		case 'sweep':
			// Sweeps have both pulse-like peaks and continuous-like dwell periods.
			// Average the gains — a generalist sensor does equally well on both
			// components, a specialist sensor gets partial benefit.
			return (affinity.pulseGain + affinity.continuousGain) / 2;
	}
}
