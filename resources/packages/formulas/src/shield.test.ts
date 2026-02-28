import { describe, it, expect } from 'vitest';
import { shieldRegenRate, shieldDraw, shieldTimeToFull } from './shield';

describe('shieldRegenRate', () => {
	it('scales base rate by priority', () => {
		expect(shieldRegenRate(10.0, 1.0)).toBe(10.0);
		expect(shieldRegenRate(10.0, 2.0)).toBe(20.0);
		expect(shieldRegenRate(10.0, 0.5)).toBe(5.0);
	});

	it('returns 0 when base rate is 0', () => {
		expect(shieldRegenRate(0, 2.0)).toBe(0);
	});
});

describe('shieldDraw', () => {
	it('scales base draw by priority', () => {
		expect(shieldDraw(5.0, 1.0)).toBe(5.0);
		expect(shieldDraw(5.0, 2.0)).toBe(10.0);
		expect(shieldDraw(5.0, 0.5)).toBe(2.5);
	});

	it('returns 0 when base draw is 0', () => {
		expect(shieldDraw(0, 2.0)).toBe(0);
	});
});

describe('shieldTimeToFull', () => {
	it('computes time in seconds from capacity and regen rate', () => {
		// (100 / 10) * 3600 = 36000 seconds
		expect(shieldTimeToFull(100, 10.0)).toBe(36000);
	});

	it('halves when regen doubles', () => {
		expect(shieldTimeToFull(100, 20.0)).toBe(18000);
	});

	it('returns Infinity when regen rate is 0', () => {
		expect(shieldTimeToFull(100, 0)).toBe(Infinity);
	});

	it('returns Infinity when regen rate is negative', () => {
		expect(shieldTimeToFull(100, -1)).toBe(Infinity);
	});
});
