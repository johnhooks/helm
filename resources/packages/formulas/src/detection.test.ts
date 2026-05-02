import { describe, it, expect } from 'vitest';
import { SENSOR_AFFINITIES, DEFAULT_DSP_CONSTANTS } from './types';
import {
	detectionProbability,
	cumulativeDetection,
	matchedFilterGain,
} from './detection';

const { detectionThreshold: threshold, detectionSteepness: steepness } =
	DEFAULT_DSP_CONSTANTS;

describe('detectionProbability', () => {
	it('returns 50% at the threshold SNR', () => {
		expect(
			detectionProbability(threshold, threshold, steepness)
		).toBeCloseTo(0.5);
	});

	it('approaches 1.0 well above threshold', () => {
		// With steepness 0.5, need ~9 SNR above threshold for >99%
		const prob = detectionProbability(threshold + 10, threshold, steepness);
		expect(prob).toBeGreaterThan(0.99);
	});

	it('approaches 0.0 well below threshold', () => {
		// With steepness 0.5, need ~9 SNR below threshold for <1%
		const prob = detectionProbability(threshold - 10, threshold, steepness);
		expect(prob).toBeLessThan(0.01);
	});

	it('is monotonically increasing with SNR', () => {
		const snrValues = [0, 0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0];
		const probs = snrValues.map((s) => detectionProbability(s));

		for (let i = 0; i < probs.length - 1; i++) {
			expect(probs[i + 1]).toBeGreaterThan(probs[i]);
		}
	});

	it('steeper curve creates sharper transition', () => {
		const shallow = detectionProbability(threshold + 0.5, threshold, 2.0);
		const steep = detectionProbability(threshold + 0.5, threshold, 8.0);

		// Steeper curve is closer to 1.0 above threshold
		expect(steep).toBeGreaterThan(shallow);
	});

	it('uses default constants when not specified', () => {
		const withDefaults = detectionProbability(1.0);
		const withExplicit = detectionProbability(1.0, threshold, steepness);
		expect(withDefaults).toBe(withExplicit);
	});
});

describe('cumulativeDetection', () => {
	it('equals per-sweep chance for a single sweep', () => {
		expect(cumulativeDetection(0.3, 1)).toBeCloseTo(0.3);
	});

	it('accumulates across multiple sweeps', () => {
		// 1 - (1 - 0.1)^6 ≈ 0.4686
		expect(cumulativeDetection(0.1, 6)).toBeCloseTo(0.4686, 3);
	});

	it('approaches 1.0 with many sweeps', () => {
		expect(cumulativeDetection(0.1, 20)).toBeCloseTo(0.878, 2);
		expect(cumulativeDetection(0.1, 50)).toBeGreaterThan(0.99);
	});

	it('returns 0 for zero sweeps', () => {
		expect(cumulativeDetection(0.5, 0)).toBe(0);
	});

	it('returns 0 for negative sweeps', () => {
		expect(cumulativeDetection(0.5, -1)).toBe(0);
	});

	it('clamps per-sweep chance to [0, 1]', () => {
		expect(cumulativeDetection(1.5, 3)).toBe(1);
		expect(cumulativeDetection(-0.5, 3)).toBe(0);
	});

	it('returns 1.0 for certain per-sweep detection', () => {
		expect(cumulativeDetection(1.0, 1)).toBe(1);
	});

	it('returns 0 for zero per-sweep chance', () => {
		expect(cumulativeDetection(0, 10)).toBe(0);
	});
});

describe('matchedFilterGain', () => {
	const acu = SENSOR_AFFINITIES.acu;
	const vrs = SENSOR_AFFINITIES.vrs;
	const dsc = SENSOR_AFFINITIES.dsc;

	it('ACU excels at pulse detection', () => {
		expect(matchedFilterGain(acu, 'pulse')).toBe(1.5);
		expect(matchedFilterGain(acu, 'pulse')).toBeGreaterThan(
			matchedFilterGain(vrs, 'pulse')
		);
	});

	it('DSC excels at continuous detection', () => {
		expect(matchedFilterGain(dsc, 'continuous')).toBe(1.25);
		expect(matchedFilterGain(dsc, 'continuous')).toBeGreaterThan(
			matchedFilterGain(vrs, 'continuous')
		);
	});

	it('VRS is neutral across all types', () => {
		expect(matchedFilterGain(vrs, 'pulse')).toBe(1.0);
		expect(matchedFilterGain(vrs, 'continuous')).toBe(1.0);
		expect(matchedFilterGain(vrs, 'sweep')).toBe(1.0);
	});

	it('sweep gain is average of pulse and continuous', () => {
		// ACU sweep: (1.5 + 0.7) / 2 = 1.1
		expect(matchedFilterGain(acu, 'sweep')).toBeCloseTo(1.1);
		// DSC sweep: (0.7 + 1.25) / 2 = 0.975
		expect(matchedFilterGain(dsc, 'sweep')).toBeCloseTo(0.975);
	});

	it('ACU is poor at continuous signals', () => {
		expect(matchedFilterGain(acu, 'continuous')).toBe(0.7);
		expect(matchedFilterGain(acu, 'continuous')).toBeLessThan(1.0);
	});

	it('DSC is poor at pulse signals', () => {
		expect(matchedFilterGain(dsc, 'pulse')).toBe(0.7);
		expect(matchedFilterGain(dsc, 'pulse')).toBeLessThan(1.0);
	});
});
