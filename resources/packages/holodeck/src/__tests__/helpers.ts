import type { Product } from '@helm/types';
import type { Hull } from '../types/hull';
import type { InstalledComponent } from '../types/component';
import type { Loadout } from '../types/loadout';
import { getHull } from '../data/hulls';

/**
 * Build a partial product with sensible defaults.
 */
export function makeProduct(overrides: Partial<Product> = {}): Product {
	return {
		id: 1,
		slug: 'test-product',
		type: 'core',
		label: 'Test Product',
		version: 1,
		hp: null,
		footprint: 10,
		rate: null,
		sustain: null,
		capacity: null,
		chance: null,
		mult_a: null,
		mult_b: null,
		mult_c: null,
		mult_d: null,
		mult_e: null,
		mult_f: null,
		...overrides,
	};
}

/**
 * Standard core: output 1.0, regen 10/hr, capacity 100, hp 500, consumption 0.5.
 */
export function makeCore(overrides: Partial<Product> = {}): Product {
	return makeProduct({
		slug: 'rc-100',
		type: 'core',
		label: 'RC-100 Reactor',
		hp: 500,
		rate: 10,
		capacity: 100,
		mult_a: 1.0,
		mult_b: 0.5,
		...overrides,
	});
}

/**
 * Standard drive: sustain 5, consumption(mult_b) 1.0, amplitude(mult_c) 0.8.
 */
export function makeDrive(overrides: Partial<Product> = {}): Product {
	return makeProduct({
		slug: 'dr-305',
		type: 'drive',
		label: 'DR-305 Drive',
		sustain: 5,
		mult_b: 1.0,
		mult_c: 0.8,
		...overrides,
	});
}

/**
 * Standard sensor: sustain 8, chance 0.85, mult_a 1.0 (scan intensity).
 */
export function makeSensor(overrides: Partial<Product> = {}): Product {
	return makeProduct({
		slug: 'vrs-200',
		type: 'sensor',
		label: 'VRS-200 Sensor',
		sustain: 8,
		chance: 0.85,
		mult_a: 1.0,
		...overrides,
	});
}

/**
 * Standard shield: capacity 50, rate 5/hr.
 */
export function makeShield(overrides: Partial<Product> = {}): Product {
	return makeProduct({
		slug: 'sh-100',
		type: 'shield',
		label: 'SH-100 Shield',
		capacity: 50,
		rate: 5,
		...overrides,
	});
}

/**
 * Standard nav: skill(mult_a) 0.8, efficiency(mult_b) 0.9.
 */
export function makeNav(overrides: Partial<Product> = {}): Product {
	return makeProduct({
		slug: 'nav-100',
		type: 'nav',
		label: 'NAV-100 Computer',
		mult_a: 0.8,
		mult_b: 0.9,
		...overrides,
	});
}

export function makeComponent(
	product: Product,
	slot: string,
	overrides: Partial<InstalledComponent> = {},
): InstalledComponent {
	return {
		product,
		slot,
		life: null,
		usageCount: 0,
		...overrides,
	};
}

/**
 * Pioneer hull from catalog data, or a fallback if not loaded.
 */
export function getTestHull(slug = 'pioneer'): Hull {
	const hull = getHull(slug);
	if (hull) {
		return hull;
	}

	return {
		slug: 'pioneer',
		label: 'Pioneer',
		internalSpace: 300,
		slots: ['core', 'drive', 'sensor', 'shield', 'nav'],
		equipmentSlots: 2,
		hullMass: 1.0,
		hullSignature: 1.0,
		hullIntegrity: 100,
	};
}

/**
 * Build a complete loadout with standard products and Pioneer hull.
 */
export function makeLoadout(overrides: Partial<Loadout> = {}): Loadout {
	const hull = overrides.hull ?? getTestHull();
	return {
		hull,
		core: overrides.core ?? makeComponent(makeCore(), 'core'),
		drive: overrides.drive ?? makeComponent(makeDrive(), 'drive'),
		sensor: overrides.sensor ?? makeComponent(makeSensor(), 'sensor'),
		shield: overrides.shield ?? makeComponent(makeShield(), 'shield'),
		nav: overrides.nav ?? makeComponent(makeNav(), 'nav'),
		equipment: overrides.equipment ?? [],
	};
}
