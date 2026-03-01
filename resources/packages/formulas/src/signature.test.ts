import { describe, it, expect } from 'vitest';
import { DEFAULT_DSP_CONSTANTS, DEFAULT_EMISSION_PROFILES, SENSOR_AFFINITIES } from './types';
import { detectionProbability, matchedFilterGain } from './detection';
import { passiveDetection } from './passive';
import { invertSigmoid, estimateEmissionPower, classifyEmission } from './signature';

const { detectionThreshold: threshold, detectionSteepness: steepness } = DEFAULT_DSP_CONSTANTS;
const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;

describe('invertSigmoid', () => {
	it('returns threshold at 50% confidence', () => {
		expect(invertSigmoid(0.5)).toBeCloseTo(threshold);
	});

	it('is the algebraic inverse of detectionProbability', () => {
		const snrValues = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0];
		for (const snrVal of snrValues) {
			const prob = detectionProbability(snrVal, threshold, steepness);
			const recovered = invertSigmoid(prob, threshold, steepness);
			expect(recovered).toBeCloseTo(snrVal, 6);
		}
	});

	it('returns 0 for confidence <= 0', () => {
		expect(invertSigmoid(0)).toBe(0);
		expect(invertSigmoid(-0.5)).toBe(0);
	});

	it('returns Infinity for confidence >= 1', () => {
		expect(invertSigmoid(1)).toBe(Infinity);
		expect(invertSigmoid(1.5)).toBe(Infinity);
	});

	it('higher confidence yields higher SNR', () => {
		const low = invertSigmoid(0.3);
		const mid = invertSigmoid(0.5);
		const high = invertSigmoid(0.7);
		expect(high).toBeGreaterThan(mid);
		expect(mid).toBeGreaterThan(low);
	});
});

describe('estimateEmissionPower', () => {
	it('round-trips through passiveDetection accurately', () => {
		// Use a signal that doesn't saturate the passive confidence cap.
		// With 5-min sample period, even moderate signals accumulate fast.
		const truePower = 1.5;
		const noise = 1.0;
		const affinity = 1.0;
		const integration = 1800; // 30 min — 6 samples at 300s period

		const confidence = passiveDetection(
			truePower, noise, affinity, integration, samplePeriod, 1.0, 0,
		);

		// Verify we're below the cap so inversion is accurate
		expect(confidence).toBeLessThan(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);

		const estimated = estimateEmissionPower(
			confidence, noise, affinity, integration, samplePeriod, 1.0, 0,
		);

		expect(estimated).toBeCloseTo(truePower, 1);
	});

	it('round-trips with DSC sensor and matched filter', () => {
		// Short integration to stay below the passive cap
		const truePower = 1.0;
		const noise = 1.0;
		const dsc = SENSOR_AFFINITIES.dsc;
		const gain = matchedFilterGain(dsc, 'continuous');
		const integration = 600; // 10 min — 2 samples

		const confidence = passiveDetection(
			truePower, noise, dsc.passive, integration, samplePeriod, gain, 0,
		);

		expect(confidence).toBeLessThan(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);

		const estimated = estimateEmissionPower(
			confidence, noise, dsc.passive, integration, samplePeriod, gain, 0,
		);

		expect(estimated).toBeCloseTo(truePower, 1);
	});

	it('estimation degrades at passive confidence cap', () => {
		// When confidence is capped, inversion can only estimate the minimum
		// power needed for that confidence — the true power is higher.
		const truePower = 5.0;
		const noise = 1.0;
		const confidence = passiveDetection(truePower, noise, 1.0, 3600, samplePeriod);

		// Confidence is capped
		expect(confidence).toBe(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);

		// Estimation underestimates — this is expected. Passive can't give
		// you the full picture. Use active scan for precise power readings.
		const estimated = estimateEmissionPower(confidence, noise, 1.0, 3600, samplePeriod);
		expect(estimated).toBeLessThan(truePower);
		expect(estimated).toBeGreaterThan(0);
	});

	it('round-trips with masking noise', () => {
		const truePower = 3.0;
		const noise = 1.0;
		const masking = 2.0;
		const integration = 3600; // 1hr — masking keeps confidence below cap

		const confidence = passiveDetection(
			truePower, noise, 1.0, integration, samplePeriod, 1.0, masking,
		);

		expect(confidence).toBeLessThan(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);

		const estimated = estimateEmissionPower(
			confidence, noise, 1.0, integration, samplePeriod, 1.0, masking,
		);

		expect(estimated).toBeCloseTo(truePower, 1);
	});

	it('higher confidence estimates higher power', () => {
		const est1 = estimateEmissionPower(0.5, 1.0, 1.0, 3600);
		const est2 = estimateEmissionPower(0.9, 1.0, 1.0, 3600);
		expect(est2).toBeGreaterThan(est1);
	});

	it('round-trips with pilotSkill != 1.0', () => {
		const truePower = 1.5;
		const noise = 1.0;
		const affinity = 1.0;
		const pilotSkill = 1.3;
		const integration = 1800;

		const confidence = passiveDetection(
			truePower, noise, affinity, integration, samplePeriod, 1.0, 0, pilotSkill,
		);

		expect(confidence).toBeLessThan(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);

		const estimated = estimateEmissionPower(
			confidence, noise, affinity, integration, samplePeriod, 1.0, 0, pilotSkill,
		);

		expect(estimated).toBeCloseTo(truePower, 1);
	});

	it('overestimates without pilotSkill correction', () => {
		const truePower = 1.5;
		const noise = 1.0;
		const affinity = 1.0;
		const pilotSkill = 1.3;
		const integration = 1800;

		const confidence = passiveDetection(
			truePower, noise, affinity, integration, samplePeriod, 1.0, 0, pilotSkill,
		);

		// Without pilotSkill, estimation overestimates by the skill factor
		const estimatedWrong = estimateEmissionPower(
			confidence, noise, affinity, integration, samplePeriod, 1.0, 0, 1.0,
		);

		const estimatedCorrect = estimateEmissionPower(
			confidence, noise, affinity, integration, samplePeriod, 1.0, 0, pilotSkill,
		);

		expect(estimatedWrong).toBeGreaterThan(truePower);
		expect(estimatedCorrect).toBeCloseTo(truePower, 1);
	});
});

describe('classifyEmission', () => {
	it('correctly identifies a PNP scan emission', () => {
		const pnpPower = DEFAULT_EMISSION_PROFILES.pnp_scan.base;
		const result = classifyEmission(pnpPower);
		expect(result[0].type).toBe('pnp_scan');
		expect(result[0].distance).toBe(0);
	});

	it('correctly identifies a mining emission', () => {
		const miningPower = DEFAULT_EMISSION_PROFILES.mining.base;
		const result = classifyEmission(miningPower);
		expect(result[0].type).toBe('mining');
		expect(result[0].distance).toBe(0);
	});

	it('returns all profiles sorted by distance', () => {
		const result = classifyEmission(3.0);
		for (let i = 0; i < result.length - 1; i++) {
			expect(result[i].distance).toBeLessThanOrEqual(result[i + 1].distance);
		}
	});

	it('breaks ties alphabetically', () => {
		// mining and salvaging both have base 1.0
		const result = classifyEmission(1.0);
		const tiedEntries = result.filter((r) => r.distance === 0);
		expect(tiedEntries.length).toBeGreaterThanOrEqual(2);
		for (let i = 0; i < tiedEntries.length - 1; i++) {
			expect(tiedEntries[i].type.localeCompare(tiedEntries[i + 1].type)).toBeLessThanOrEqual(0);
		}
	});

	it('works with custom profiles', () => {
		const profiles: Record<string, { base: number; spectralType: 'pulse' }> = {
			foo: { base: 10, spectralType: 'pulse' },
			bar: { base: 20, spectralType: 'pulse' },
		};
		const result = classifyEmission(12, profiles);
		expect(result[0].type).toBe('foo');
		expect(result[0].distance).toBe(2);
		expect(result[1].type).toBe('bar');
		expect(result[1].distance).toBe(8);
	});
});
