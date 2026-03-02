import { describe, it, expect } from 'vitest';
import { discoveryProbability, firstHopChance, NAV_CONSTANTS } from './nav';

describe('discoveryProbability', () => {
	it('returns skill * efficiency at depth 0', () => {
		// 0.6 * 0.7 * 0.9^0 = 0.42
		expect(discoveryProbability(0.6, 0.7, 0, 0.9)).toBeCloseTo(0.42);
	});

	it('decays with depth', () => {
		const depth0 = discoveryProbability(0.6, 0.7, 0, 0.9);
		const depth1 = discoveryProbability(0.6, 0.7, 1, 0.9);
		const depth2 = discoveryProbability(0.6, 0.7, 2, 0.9);

		expect(depth1).toBeLessThan(depth0);
		expect(depth2).toBeLessThan(depth1);
		// depth1 = 0.42 * 0.9 = 0.378
		expect(depth1).toBeCloseTo(0.378);
	});

	it('caps at 0.95 for high skill and efficiency', () => {
		expect(discoveryProbability(1.0, 1.5, 0, 0.9)).toBe(0.95);
	});

	it('returns 0.01 when skill is 0', () => {
		expect(discoveryProbability(0, 0.7, 0, 0.9)).toBe(0.01);
	});

	it('returns 0.01 when efficiency is 0', () => {
		expect(discoveryProbability(0.6, 0, 0, 0.9)).toBe(0.01);
	});

	it('approaches 0 at high depth', () => {
		const prob = discoveryProbability(0.6, 0.7, 20, 0.9);
		expect(prob).toBeLessThan(0.1);
		expect(prob).toBeGreaterThan(0);
	});

	it('pilotSkill default 1.0 matches no-arg behavior', () => {
		expect(discoveryProbability(0.6, 0.7, 0, 0.9, 1.0))
			.toBe(discoveryProbability(0.6, 0.7, 0, 0.9));
	});

	it('pilotSkill boosts discovery probability', () => {
		// 0.6 * 0.7 * 0.9^0 * 1.25 = 0.525
		expect(discoveryProbability(0.6, 0.7, 0, 0.9, 1.25)).toBeCloseTo(0.525);
	});

	it('pilotSkill boost is still capped at 0.95', () => {
		expect(discoveryProbability(1.0, 1.0, 0, 0.9, 1.25)).toBe(0.95);
	});

	it('pilotSkill boost compounds with depth decay', () => {
		// depth=2: 0.6 * 0.7 * 0.9^2 * 1.25 = 0.42 * 0.81 * 1.25 = 0.42525
		const base = discoveryProbability(0.6, 0.7, 2, 0.9);
		const boosted = discoveryProbability(0.6, 0.7, 2, 0.9, 1.25);
		expect(boosted).toBeCloseTo(base * 1.25);
	});
});

describe('NAV_CONSTANTS', () => {
	it('has expected values', () => {
		expect(NAV_CONSTANTS.MAX_RANGE).toBe(7.0);
		expect(NAV_CONSTANTS.DISTANCE_SCALE).toBe(10.0);
		expect(NAV_CONSTANTS.MAX_SCATTER).toBe(0.1);
		expect(NAV_CONSTANTS.ALGORITHM_VERSION).toBe(1);
	});
});

describe('firstHopChance', () => {
	it('returns high chance for close, easy corridors', () => {
		const chance = firstHopChance(0.85, 1.0, 0.0);
		// 0.85 * exp(-1/10) * (1 - 0*0.3) = 0.85 * 0.9048 = 0.7691
		expect(chance).toBeCloseTo(0.7691, 3);
	});

	it('decreases with distance', () => {
		const close = firstHopChance(0.85, 1.0, 0.0);
		const far = firstHopChance(0.85, 5.0, 0.0);
		expect(far).toBeLessThan(close);
	});

	it('decreases with difficulty', () => {
		const easy = firstHopChance(0.85, 3.0, 0.0);
		const hard = firstHopChance(0.85, 3.0, 1.0);
		expect(hard).toBeLessThan(easy);
	});

	it('is clamped to minimum 0.01', () => {
		const chance = firstHopChance(0.01, 100, 1.0);
		expect(chance).toBe(0.01);
	});

	it('is clamped to maximum 0.99', () => {
		const chance = firstHopChance(1.0, 0.0, 0.0);
		// 1.0 * exp(0) * 1.0 = 1.0 → clamped to 0.99
		expect(chance).toBe(0.99);
	});

	it('difficulty reduces chance by up to 30%', () => {
		const noDifficulty = firstHopChance(0.85, 3.0, 0.0);
		const maxDifficulty = firstHopChance(0.85, 3.0, 1.0);
		// With difficulty 1.0: factor is (1.0 - 1.0 * 0.3) = 0.7
		expect(maxDifficulty).toBeCloseTo(noDifficulty * 0.7, 3);
	});
});
