import { describe, it, expect } from 'vitest';
import type { Product } from '@helm/types';
import { DEFAULT_CONSTANTS } from './types';
import { scanComfortRange, scanPowerCost, scanDuration, scanSuccessChance } from './scan';

const vrsMk1: Product = {
	id: 1, slug: 'vrs_mk1', type: 'sensor', label: 'VRS Mk I', version: 1,
	footprint: 25, hp: null, rate: null, sustain: 5.0, capacity: null,
	chance: 0.7, mult_a: 1.0, mult_b: null, mult_c: null,
	mult_d: null, mult_e: null, mult_f: null,
};

const dscMk1: Product = {
	id: 2, slug: 'dsc_mk1', type: 'sensor', label: 'DSC Mk I', version: 1,
	footprint: 40, hp: null, rate: null, sustain: 7.0, capacity: null,
	chance: 0.6, mult_a: 2.0, mult_b: null, mult_c: null,
	mult_d: null, mult_e: null, mult_f: null,
};

const acuMk1: Product = {
	id: 3, slug: 'acu_mk1', type: 'sensor', label: 'ACU Mk I', version: 1,
	footprint: 15, hp: null, rate: null, sustain: 3.0, capacity: null,
	chance: 0.85, mult_a: 0.5, mult_b: null, mult_c: null,
	mult_d: null, mult_e: null, mult_f: null,
};

const constants = DEFAULT_CONSTANTS;

describe('scanComfortRange', () => {
	it('scales sensor sustain by core output', () => {
		expect(scanComfortRange(vrsMk1, 1.0)).toBe(5.0);
		expect(scanComfortRange(vrsMk1, 1.3)).toBeCloseTo(6.5);
		expect(scanComfortRange(dscMk1, 1.0)).toBe(7.0);
	});

	it('returns positive range for all sensors', () => {
		expect(scanComfortRange(vrsMk1, 1.0)).toBeGreaterThan(0);
		expect(scanComfortRange(dscMk1, 1.0)).toBeGreaterThan(0);
		expect(scanComfortRange(acuMk1, 1.0)).toBeGreaterThan(0);
	});
});

describe('scanPowerCost', () => {
	it('scales linearly with distance within comfort', () => {
		expect(scanPowerCost(1, constants, 5.0)).toBe(2.0);
		expect(scanPowerCost(3, constants, 5.0)).toBe(6.0);
		expect(scanPowerCost(5, constants, 5.0)).toBe(10.0);
	});

	it('increases with strain past comfort range', () => {
		// At 2x comfort (10 ly with comfort 5): strain = 2.0
		// cost = 10 * 2.0 * 2.0 = 40.0
		const costAtComfort = scanPowerCost(5, constants, 5.0);
		const costPastComfort = scanPowerCost(10, constants, 5.0);
		expect(costPastComfort).toBeGreaterThan(costAtComfort * 2);
		expect(costPastComfort).toBe(40.0);
	});
});

describe('scanDuration', () => {
	it('uses base seconds per ly scaled by sensor mult_a at effort 1.0', () => {
		// VRS: ceil(1 * 30 * 1.0 * 1.0) = 30
		expect(scanDuration(1, vrsMk1, 1.0, constants)).toBe(30);
		// DSC: ceil(1 * 30 * 2.0 * 1.0) = 60 (slower scan, longer range)
		expect(scanDuration(1, dscMk1, 1.0, constants)).toBe(60);
		// ACU: ceil(1 * 30 * 0.5 * 1.0) = 15 (fast scan, short range)
		expect(scanDuration(1, acuMk1, 1.0, constants)).toBe(15);
	});

	it('scales linearly with distance (no strain on duration)', () => {
		expect(scanDuration(3, vrsMk1, 1.0, constants)).toBe(90);
		// 10 ly is 2x comfort for VRS — duration is still linear
		expect(scanDuration(10, vrsMk1, 1.0, constants)).toBe(300);
	});

	it('returns positive duration for all sensors', () => {
		expect(scanDuration(1, vrsMk1, 1.0, constants)).toBeGreaterThan(0);
		expect(scanDuration(1, dscMk1, 1.0, constants)).toBeGreaterThan(0);
		expect(scanDuration(1, acuMk1, 1.0, constants)).toBeGreaterThan(0);
	});

	it('effort 2.0 doubles duration', () => {
		expect(scanDuration(1, vrsMk1, 2.0, constants)).toBe(60);
		expect(scanDuration(3, vrsMk1, 2.0, constants)).toBe(180);
	});

	it('effort 0.5 halves duration', () => {
		expect(scanDuration(1, vrsMk1, 0.5, constants)).toBe(15);
	});
});

describe('scanSuccessChance', () => {
	it('returns base chance within comfort range at effort 1.0', () => {
		expect(scanSuccessChance(vrsMk1, 1, 5.0, 1.0)).toBe(0.7);
		expect(scanSuccessChance(vrsMk1, 5, 5.0, 1.0)).toBe(0.7);
		expect(scanSuccessChance(dscMk1, 3, 7.0, 1.0)).toBe(0.6);
		expect(scanSuccessChance(acuMk1, 2, 3.0, 1.0)).toBe(0.85);
	});

	it('drops with distance past comfort range', () => {
		// VRS at 2x comfort (10 ly, comfort 5): strain = 2.0, chance = 0.7 / 2.0 = 0.35
		expect(scanSuccessChance(vrsMk1, 10, 5.0, 1.0)).toBeCloseTo(0.35);
	});

	it('drops steeply at 3x comfort', () => {
		// VRS at 3x comfort (15 ly, comfort 5): strain = 5.0, chance = 0.7 / 5.0 = 0.14
		expect(scanSuccessChance(vrsMk1, 15, 5.0, 1.0)).toBeCloseTo(0.14);
	});

	it('high-chance sensor degrades more gracefully', () => {
		// ACU at 2x comfort (6 ly, comfort 3): strain = 2.0, chance = 0.85 / 2.0 = 0.425
		expect(scanSuccessChance(acuMk1, 6, 3.0, 1.0)).toBeCloseTo(0.425);
		// Still better than VRS at 2x comfort (0.35)
		expect(scanSuccessChance(acuMk1, 6, 3.0, 1.0)).toBeGreaterThan(scanSuccessChance(vrsMk1, 10, 5.0, 1.0));
	});

	it('effort 2.0 past comfort recovers chance, capped at base', () => {
		// VRS at 2x comfort: strain = 2.0, (0.7 / 2.0) * 2.0 = 0.7 → capped at 0.7
		expect(scanSuccessChance(vrsMk1, 10, 5.0, 2.0)).toBeCloseTo(0.7);
		// VRS at 3x comfort: strain = 5.0, (0.7 / 5.0) * 2.0 = 0.28 → below cap
		expect(scanSuccessChance(vrsMk1, 15, 5.0, 2.0)).toBeCloseTo(0.28);
	});

	it('effort within comfort is capped at base chance', () => {
		// Within comfort, strain = 1.0: (0.7 / 1.0) * 2.0 = 1.4 → capped at 0.7
		expect(scanSuccessChance(vrsMk1, 3, 5.0, 2.0)).toBe(0.7);
	});

	it('effort 0.5 halves chance', () => {
		// Within comfort: (0.7 / 1.0) * 0.5 = 0.35
		expect(scanSuccessChance(vrsMk1, 3, 5.0, 0.5)).toBeCloseTo(0.35);
	});

	it('pilotSkill default 1.0 matches no-arg behavior', () => {
		expect(scanSuccessChance(vrsMk1, 5, 5.0, 1.0, 1.0))
			.toBe(scanSuccessChance(vrsMk1, 5, 5.0, 1.0));
	});

	it('pilotSkill 1.25 raises ceiling and effective chance within comfort', () => {
		// Within comfort, strain=1.0: min(0.7*1.25, (0.7/1.0)*1.0*1.25) = min(0.875, 0.875)
		expect(scanSuccessChance(vrsMk1, 3, 5.0, 1.0, 1.25)).toBeCloseTo(0.875);
	});

	it('pilotSkill boosts chance past comfort range', () => {
		// VRS at 2x comfort (10 ly, comfort 5): strain=2.0
		// no skill: (0.7/2.0)*1.0 = 0.35
		// with skill: (0.7/2.0)*1.0*1.25 = 0.4375
		const noSkill = scanSuccessChance(vrsMk1, 10, 5.0, 1.0);
		const withSkill = scanSuccessChance(vrsMk1, 10, 5.0, 1.0, 1.25);
		expect(withSkill).toBeGreaterThan(noSkill);
		expect(withSkill).toBeCloseTo(0.4375);
	});
});
