import { describe, it, expect } from 'vitest';
import { discoveryProbability } from './nav';

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

	it('caps at 1.0 for high skill and efficiency', () => {
		expect(discoveryProbability(1.0, 1.5, 0, 0.9)).toBe(1.0);
	});

	it('returns 0 when skill is 0', () => {
		expect(discoveryProbability(0, 0.7, 0, 0.9)).toBe(0);
	});

	it('returns 0 when efficiency is 0', () => {
		expect(discoveryProbability(0.6, 0, 0, 0.9)).toBe(0);
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

	it('pilotSkill boost is still capped at 1.0', () => {
		expect(discoveryProbability(1.0, 1.0, 0, 0.9, 1.25)).toBe(1.0);
	});

	it('pilotSkill boost compounds with depth decay', () => {
		// depth=2: 0.6 * 0.7 * 0.9^2 * 1.25 = 0.42 * 0.81 * 1.25 = 0.42525
		const base = discoveryProbability(0.6, 0.7, 2, 0.9);
		const boosted = discoveryProbability(0.6, 0.7, 2, 0.9, 1.25);
		expect(boosted).toBeCloseTo(base * 1.25);
	});
});
