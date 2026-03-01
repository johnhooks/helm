import { describe, it, expect } from 'vitest';
import { HullSystem } from './hull';
import { createInternalState } from '../state';
import { makeLoadout } from '../test-helpers';

function createHullSystem(hullIntegrity?: number) {
	const loadout = makeLoadout();
	const state = createInternalState(loadout, { hullIntegrity });
	return new HullSystem(state);
}

describe('HullSystem', () => {
	it('reports integrity and max from loadout', () => {
		const hull = createHullSystem();
		expect(hull.getIntegrity()).toBe(hull.getMaxIntegrity());
		expect(hull.getMaxIntegrity()).toBe(100);
	});

	it('reports integrity percent', () => {
		const hull = createHullSystem(50);
		expect(hull.getIntegrityPercent()).toBe(0.5);
	});

	it('isDestroyed when integrity is 0', () => {
		expect(createHullSystem(0).isDestroyed()).toBe(true);
		expect(createHullSystem(1).isDestroyed()).toBe(false);
	});

	it('isCritical at default 25% threshold', () => {
		expect(createHullSystem(25).isCritical()).toBe(true);
		expect(createHullSystem(26).isCritical()).toBe(false);
	});

	it('isCritical with custom threshold', () => {
		expect(createHullSystem(50).isCritical(0.5)).toBe(true);
		expect(createHullSystem(51).isCritical(0.5)).toBe(false);
	});

	it('calculateIntegrityAfterDamage clamps to 0', () => {
		const hull = createHullSystem(30);
		expect(hull.calculateIntegrityAfterDamage(20)).toBe(10);
		expect(hull.calculateIntegrityAfterDamage(50)).toBe(0);
	});

	it('calculateIntegrityAfterRepair clamps to max', () => {
		const hull = createHullSystem(80);
		expect(hull.calculateIntegrityAfterRepair(10)).toBe(90);
		expect(hull.calculateIntegrityAfterRepair(50)).toBe(100);
	});
});
