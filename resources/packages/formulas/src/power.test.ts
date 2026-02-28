import { describe, it, expect } from 'vitest';
import type { Product } from '@helm/types';
import { coreOutput, regenRate, perfRatio } from './power';

const epochS: Product = {
	id: 1, slug: 'epoch_s', type: 'core', label: 'Epoch-S', version: 1,
	footprint: 25, hp: 750, rate: 10.0, sustain: null, capacity: null,
	chance: null, mult_a: 1.0, mult_b: 1.0, mult_c: null,
};

const epochR: Product = {
	id: 2, slug: 'epoch_r', type: 'core', label: 'Epoch-R', version: 1,
	footprint: 35, hp: 500, rate: 20.0, sustain: null, capacity: null,
	chance: null, mult_a: 1.1, mult_b: 1.5, mult_c: null,
};

const dr505: Product = {
	id: 3, slug: 'dr_505', type: 'drive', label: 'DR-505', version: 1,
	footprint: 30, hp: null, rate: null, sustain: 7.0, capacity: null,
	chance: null, mult_a: 1.0, mult_b: 1.0, mult_c: 1.0,
};

const dr705: Product = {
	id: 4, slug: 'dr_705', type: 'drive', label: 'DR-705', version: 1,
	footprint: 45, hp: null, rate: null, sustain: 5.0, capacity: null,
	chance: null, mult_a: 2.0, mult_b: 1.5, mult_c: 2.0,
};

describe('coreOutput', () => {
	it('returns core mult_a directly', () => {
		expect(coreOutput(epochS)).toBe(1.0);
		expect(coreOutput(epochR)).toBeCloseTo(1.1);
	});
});

describe('regenRate', () => {
	it('returns core rate directly', () => {
		expect(regenRate(epochS)).toBe(10.0);
		expect(regenRate(epochR)).toBe(20.0);
	});
});

describe('perfRatio', () => {
	it('returns 1.0 when output meets consumption', () => {
		expect(perfRatio(1.0, dr505)).toBe(1.0);
	});

	it('caps at 1.0 when output exceeds consumption', () => {
		expect(perfRatio(2.0, dr505)).toBe(1.0);
	});

	it('returns ratio when underpowered', () => {
		// output 1.0 / consumption 1.5 = 0.667
		expect(perfRatio(1.0, dr705)).toBeCloseTo(0.667, 2);
	});

	it('returns 1 when consumption is 0', () => {
		const zeroDrive = { ...dr505, mult_b: 0 };
		expect(perfRatio(1.0, zeroDrive)).toBe(1);
	});
});
