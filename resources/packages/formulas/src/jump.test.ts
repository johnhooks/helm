import { describe, it, expect } from 'vitest';
import type { Product } from '@helm/types';
import { DEFAULT_CONSTANTS } from './types';
import { strainFactor, jumpComfortRange, jumpDuration, jumpCoreCost, jumpPowerCost } from './jump';

const epochS: Product = {
	id: 1, slug: 'epoch_s', type: 'core', label: 'Epoch-S', version: 1,
	footprint: 25, hp: 750, rate: 10.0, sustain: null, capacity: null,
	chance: null, mult_a: 1.0, mult_b: 1.0, mult_c: null,
	mult_d: null, mult_e: null, mult_f: null,
};

const dr505: Product = {
	id: 2, slug: 'dr_505', type: 'drive', label: 'DR-505', version: 1,
	footprint: 30, hp: null, rate: null, sustain: 7.0, capacity: null,
	chance: null, mult_a: 1.0, mult_b: 1.0, mult_c: 1.0,
	mult_d: null, mult_e: null, mult_f: null,
};

const dr705: Product = {
	id: 3, slug: 'dr_705', type: 'drive', label: 'DR-705', version: 1,
	footprint: 45, hp: null, rate: null, sustain: 5.0, capacity: null,
	chance: null, mult_a: 2.0, mult_b: 1.5, mult_c: 2.0,
	mult_d: null, mult_e: null, mult_f: null,
};

const constants = DEFAULT_CONSTANTS;

describe('strainFactor', () => {
	it('returns 1.0 at or below comfort range', () => {
		expect(strainFactor(3, 7)).toBe(1.0);
		expect(strainFactor(7, 7)).toBe(1.0);
	});

	it('returns 1.25 at 1.5x comfort', () => {
		expect(strainFactor(7.5, 5)).toBeCloseTo(1.25);
	});

	it('returns 2.0 at 2x comfort', () => {
		expect(strainFactor(10, 5)).toBeCloseTo(2.0);
	});

	it('returns 5.0 at 3x comfort', () => {
		expect(strainFactor(15, 5)).toBeCloseTo(5.0);
	});

	it('returns Infinity when comfort range is 0', () => {
		expect(strainFactor(1, 0)).toBe(Infinity);
	});

	it('returns Infinity when comfort range is negative', () => {
		expect(strainFactor(1, -1)).toBe(Infinity);
	});
});

describe('jumpComfortRange', () => {
	it('equals drive sustain at full power and perf', () => {
		expect(jumpComfortRange(dr505, 1.0, 1.0)).toBe(7.0);
	});

	it('scales with core output', () => {
		expect(jumpComfortRange(dr505, 1.3, 1.0)).toBeCloseTo(9.1);
	});

	it('degrades with perf ratio', () => {
		expect(jumpComfortRange(dr505, 1.0, 0.5)).toBe(3.5);
	});

	it('returns positive range for all drives', () => {
		expect(jumpComfortRange(dr505, 1.0, 1.0)).toBeGreaterThan(0);
		expect(jumpComfortRange(dr705, 1.0, 1.0)).toBeGreaterThan(0);
	});
});

describe('jumpDuration', () => {
	it('is BASE_SECONDS_PER_LY / amplitude for 1 ly at throttle 1.0', () => {
		// DR-505 at full power: amplitude = 1.0 * 1.0 * 1.0 = 1.0
		// duration = ceil(1 * 3600 / (1.0 * 1.0)) = 3600
		expect(jumpDuration(1, dr505, 1.0, 1.0, 1.0, constants)).toBe(3600);
	});

	it('halves with doubled amplitude', () => {
		// DR-705 at full power: amplitude = 2.0 * 1.0 * 1.0 = 2.0
		// duration = ceil(1 * 3600 / (2.0 * 1.0)) = 1800
		expect(jumpDuration(1, dr705, 1.0, 1.0, 1.0, constants)).toBe(1800);
	});

	it('scales linearly with distance', () => {
		expect(jumpDuration(3, dr505, 1.0, 1.0, 1.0, constants)).toBe(10800);
	});

	it('scales linearly past comfort range (no strain on duration)', () => {
		// 14 ly at comfort 7 — duration is still purely linear
		expect(jumpDuration(14, dr505, 1.0, 1.0, 1.0, constants)).toBe(50400);
		expect(jumpDuration(7, dr505, 1.0, 1.0, 1.0, constants)).toBe(25200);
	});

	it('increases when underpowered', () => {
		// perfRatio 0.5: amplitude = 1.0 * 1.0 * 0.5 = 0.5
		// duration = ceil(1 * 3600 / (0.5 * 1.0)) = 7200
		expect(jumpDuration(1, dr505, 1.0, 0.5, 1.0, constants)).toBe(7200);
	});

	it('returns Infinity when amplitude is 0', () => {
		const zeroDrive = { ...dr505, mult_c: 0 };
		expect(jumpDuration(1, zeroDrive, 1.0, 1.0, 1.0, constants)).toBe(Infinity);
	});

	it('throttle 0.5 doubles duration', () => {
		// amplitude 1.0 * throttle 0.5 = effective 0.5
		// duration = ceil(1 * 3600 / 0.5) = 7200
		expect(jumpDuration(1, dr505, 1.0, 1.0, 0.5, constants)).toBe(7200);
	});

	it('throttle 2.0 halves duration', () => {
		// amplitude 1.0 * throttle 2.0 = effective 2.0
		// duration = ceil(1 * 3600 / 2.0) = 1800
		expect(jumpDuration(1, dr505, 1.0, 1.0, 2.0, constants)).toBe(1800);
	});
});

describe('jumpCoreCost', () => {
	it('is distance * core.mult_b * drive.mult_b * throttle within comfort', () => {
		// Throttle 1.0: 1 * 1.0 * 1.0 * 1.0 * 1.0 = 1.0
		expect(jumpCoreCost(1, epochS, dr505, 1.0, 7.0)).toBe(1.0);
		expect(jumpCoreCost(3, epochS, dr505, 1.0, 7.0)).toBe(3.0);
	});

	it('scales with drive consumption', () => {
		// DR-705: 1 * 1.0 * 1.5 * 1.0 * 1.0 = 1.5
		expect(jumpCoreCost(1, epochS, dr705, 1.0, 5.0)).toBe(1.5);
	});

	it('throttle <= 0.5 returns 0 (limp home)', () => {
		expect(jumpCoreCost(5, epochS, dr505, 0.5, 7.0)).toBe(0);
		expect(jumpCoreCost(5, epochS, dr505, 0.3, 7.0)).toBe(0);
	});

	it('throttle 2.0 doubles cost', () => {
		// 1 * 1.0 * 1.0 * 2.0 * 1.0 = 2.0
		expect(jumpCoreCost(1, epochS, dr505, 2.0, 7.0)).toBe(2.0);
	});

	it('increases with strain past comfort range', () => {
		// At 2x comfort (14 ly with comfort 7): strain = 2.0
		// cost = 14 * 1.0 * 1.0 * 1.0 * 2.0 = 28.0
		const costAtComfort = jumpCoreCost(7, epochS, dr505, 1.0, 7.0);
		const costPastComfort = jumpCoreCost(14, epochS, dr505, 1.0, 7.0);
		// pastComfort should be more than 2x costAtComfort
		expect(costPastComfort).toBeGreaterThan(costAtComfort * 2);
		expect(costPastComfort).toBe(28.0);
	});
});

describe('jumpPowerCost', () => {
	it('scales linearly with distance within comfort', () => {
		// 1 * 8.0 * 1.0 = 8.0
		expect(jumpPowerCost(1, constants, 7.0)).toBe(8.0);
		// 3 * 8.0 * 1.0 = 24.0
		expect(jumpPowerCost(3, constants, 7.0)).toBe(24.0);
	});

	it('increases with strain past comfort range', () => {
		// At 2x comfort (14 ly with comfort 7): strain = 2.0
		// cost = 14 * 8.0 * 2.0 = 224.0
		const costAtComfort = jumpPowerCost(7, constants, 7.0);
		const costPastComfort = jumpPowerCost(14, constants, 7.0);
		expect(costPastComfort).toBeGreaterThan(costAtComfort * 2);
		expect(costPastComfort).toBe(224.0);
	});

	it('uses baseJumpPowerPerLy from constants', () => {
		const customConstants = { ...constants, baseJumpPowerPerLy: 4.0 };
		expect(jumpPowerCost(1, customConstants, 7.0)).toBe(4.0);
	});
});
