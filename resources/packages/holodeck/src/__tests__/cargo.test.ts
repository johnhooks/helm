import { describe, it, expect } from 'vitest';
import { CargoSystem } from '../systems/cargo';
import { createInternalState } from '../state';
import { makeLoadout } from './helpers';

function createCargoSystem(
	cargo: Record<string, number> = {},
	ammo: Record<string, number> = {},
) {
	const state = createInternalState(makeLoadout(), { cargo, ammo });
	return new CargoSystem(state);
}

describe('CargoSystem', () => {
	it('quantity returns 0 for unknown slug', () => {
		const sys = createCargoSystem();
		expect(sys.quantity('ore')).toBe(0);
	});

	it('quantity returns stored amount', () => {
		const sys = createCargoSystem({ ore: 10, gas: 5 });
		expect(sys.quantity('ore')).toBe(10);
		expect(sys.quantity('gas')).toBe(5);
	});

	it('all returns a copy of cargo', () => {
		const sys = createCargoSystem({ ore: 10 });
		const all = sys.all();
		expect(all).toEqual({ ore: 10 });
	});

	it('total sums all quantities', () => {
		const sys = createCargoSystem({ ore: 10, gas: 5, crystal: 3 });
		expect(sys.total()).toBe(18);
	});

	it('total is 0 for empty cargo', () => {
		expect(createCargoSystem().total()).toBe(0);
	});

	it('has checks minimum quantity', () => {
		const sys = createCargoSystem({ ore: 5 });
		expect(sys.has('ore')).toBe(true);
		expect(sys.has('ore', 5)).toBe(true);
		expect(sys.has('ore', 6)).toBe(false);
		expect(sys.has('gas')).toBe(false);
	});

	it('isEmpty', () => {
		expect(createCargoSystem().isEmpty()).toBe(true);
		expect(createCargoSystem({ ore: 1 }).isEmpty()).toBe(false);
	});

	it('ammoCount and allAmmo', () => {
		const sys = createCargoSystem({}, { torpedo: 8, mine: 2 });
		expect(sys.ammoCount('torpedo')).toBe(8);
		expect(sys.ammoCount('unknown')).toBe(0);
		expect(sys.allAmmo()).toEqual({ torpedo: 8, mine: 2 });
	});
});
