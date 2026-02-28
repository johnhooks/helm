import type { Product, WithRestLinks } from '@helm/types';
import type { State } from '../types';
import { initializeDefaultState } from '../reducer';

export function createProduct(
	overrides: Partial< Product > = {}
): WithRestLinks< Product > {
	return {
		id: 1,
		slug: 'epoch_s',
		type: 'core',
		label: 'Epoch-S Standard',
		version: 1,
		hp: null,
		footprint: 4,
		rate: 0.5,
		sustain: null,
		capacity: null,
		chance: null,
		mult_a: 1.0,
		mult_b: 0.8,
		mult_c: null,
		...overrides,
	};
}

export function createState(
	overrides: Partial< State > = {}
): State {
	const defaults = initializeDefaultState();
	return {
		...defaults,
		...overrides,
	};
}
