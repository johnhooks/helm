import { describe, it, expect } from 'vitest';
import {
	transitShieldRegenRate,
	transitShieldRecovered,
	coreResonanceCost,
	sensorShieldCouplingMultiplier,
} from './mechanics';

describe('transitShieldRegenRate', () => {
	it('returns half regen at magnitude 0.5', () => {
		expect(transitShieldRegenRate(10, 0.5)).toBe(5);
	});

	it('returns full regen at magnitude 1.0', () => {
		expect(transitShieldRegenRate(10, 1.0)).toBe(10);
	});

	it('returns 0 when regen rate is 0', () => {
		expect(transitShieldRegenRate(0, 0.5)).toBe(0);
	});

	it('returns 0 when magnitude is 0', () => {
		expect(transitShieldRegenRate(10, 0)).toBe(0);
	});
});

describe('transitShieldRecovered', () => {
	it('recovers based on rate, duration, and magnitude', () => {
		// 10 HP/hr regen * 0.5 magnitude = 5 HP/hr transit rate
		// 1800s (0.5 hr) transit → 2.5 HP recovered
		expect(transitShieldRecovered(10, 1800, 0.5)).toBe(2.5);
	});

	it('recovers 0 when duration is 0', () => {
		expect(transitShieldRecovered(10, 0, 0.5)).toBe(0);
	});

	it('recovers 0 when regen rate is 0', () => {
		expect(transitShieldRecovered(0, 1800, 0.5)).toBe(0);
	});

	it('scales linearly with duration', () => {
		const short = transitShieldRecovered(10, 900, 0.5);
		const long = transitShieldRecovered(10, 1800, 0.5);
		expect(long).toBe(short * 2);
	});
});

describe('coreResonanceCost', () => {
	it('at magnitude 1.0, all cost becomes core damage', () => {
		const result = coreResonanceCost(20, 1.0);
		expect(result.capacitorCost).toBe(0);
		expect(result.coreDamage).toBe(20);
	});

	it('at magnitude 0.5, cost is split evenly', () => {
		const result = coreResonanceCost(20, 0.5);
		expect(result.capacitorCost).toBe(10);
		expect(result.coreDamage).toBe(10);
	});

	it('at magnitude 0, all cost goes to capacitor', () => {
		const result = coreResonanceCost(20, 0);
		expect(result.capacitorCost).toBe(20);
		expect(result.coreDamage).toBe(0);
	});

	it('returns zero for both when cost is 0', () => {
		const result = coreResonanceCost(0, 1.0);
		expect(result.capacitorCost).toBe(0);
		expect(result.coreDamage).toBe(0);
	});

	it('clamps magnitude > 1 to 1', () => {
		const result = coreResonanceCost(20, 1.5);
		expect(result.capacitorCost).toBe(0);
		expect(result.coreDamage).toBe(20);
	});

	it('clamps magnitude < 0 to 0', () => {
		const result = coreResonanceCost(20, -0.5);
		expect(result.capacitorCost).toBe(20);
		expect(result.coreDamage).toBe(0);
	});
});

describe('sensorShieldCouplingMultiplier', () => {
	it('returns 1.4 at magnitude 0.4', () => {
		expect(sensorShieldCouplingMultiplier(0.4)).toBeCloseTo(1.4);
	});

	it('returns 1.0 at magnitude 0 (no bonus)', () => {
		expect(sensorShieldCouplingMultiplier(0)).toBe(1);
	});

	it('returns 2.0 at magnitude 1.0', () => {
		expect(sensorShieldCouplingMultiplier(1.0)).toBe(2);
	});
});
