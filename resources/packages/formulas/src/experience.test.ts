import { describe, it, expect } from 'vitest';
import { buffFactor, skillMultiplier } from './experience';

describe('buffFactor', () => {
	it('returns 0 for count 0', () => {
		expect(buffFactor(0)).toBe(0);
	});

	it('returns 0 for negative count', () => {
		expect(buffFactor(-10)).toBe(0);
	});

	it('returns value between 0 and 1 for positive count', () => {
		const factor = buffFactor(100);
		expect(factor).toBeGreaterThan(0);
		expect(factor).toBeLessThan(1);
	});

	it('approaches 1.0 at maxMeaningful', () => {
		// At exactly maxMeaningful, factor should be very close to 1.0
		const factor = buffFactor(5000, 5000);
		expect(factor).toBeCloseTo(1.0, 5);
	});

	it('caps at 1.0 for counts beyond maxMeaningful', () => {
		expect(buffFactor(50000, 5000)).toBe(1.0);
	});

	it('is monotonically increasing', () => {
		const counts = [0, 1, 10, 50, 100, 500, 1000, 5000];
		for (let i = 1; i < counts.length; i++) {
			expect(buffFactor(counts[i])).toBeGreaterThan(
				buffFactor(counts[i - 1])
			);
		}
	});

	it('has rapid early gains (first 100 > half of first 1000)', () => {
		const first100 = buffFactor(100);
		const first1000 = buffFactor(1000);
		expect(first100).toBeGreaterThan(first1000 / 2);
	});

	it('respects custom maxMeaningful', () => {
		const lowMax = buffFactor(100, 100);
		const highMax = buffFactor(100, 10000);
		expect(lowMax).toBeGreaterThan(highMax);
	});
});

describe('skillMultiplier', () => {
	it('returns minMult for count 0', () => {
		expect(skillMultiplier(0)).toBe(1.0);
	});

	it('returns maxMult at maxMeaningful', () => {
		expect(skillMultiplier(5000, 5000)).toBeCloseTo(1.25, 4);
	});

	it('caps at maxMult for very high counts', () => {
		expect(skillMultiplier(100000)).toBe(1.25);
	});

	it('stays within [minMult, maxMult] range', () => {
		const counts = [0, 1, 10, 100, 1000, 5000, 50000];
		for (const count of counts) {
			const mult = skillMultiplier(count);
			expect(mult).toBeGreaterThanOrEqual(1.0);
			expect(mult).toBeLessThanOrEqual(1.25);
		}
	});

	it('respects custom min/max multipliers', () => {
		expect(skillMultiplier(0, 5000, 0.5, 2.0)).toBe(0.5);
		expect(skillMultiplier(5000, 5000, 0.5, 2.0)).toBeCloseTo(2.0, 4);
	});

	it('is monotonically increasing', () => {
		const counts = [0, 1, 10, 50, 100, 500, 1000, 5000];
		for (let i = 1; i < counts.length; i++) {
			expect(skillMultiplier(counts[i])).toBeGreaterThan(
				skillMultiplier(counts[i - 1])
			);
		}
	});
});
