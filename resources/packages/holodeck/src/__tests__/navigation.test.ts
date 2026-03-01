import { describe, it, expect } from 'vitest';
import { NavigationSystem } from '../systems/navigation';
import { createInternalState } from '../state';
import { makeLoadout, makeComponent, makeNav } from './helpers';

function createNavSystem(
	overrides: Parameters<typeof createInternalState>[1] = {},
	navOverrides: Record<string, unknown> = {},
) {
	const loadout = makeLoadout(
		Object.keys(navOverrides).length
			? { nav: makeComponent(makeNav(navOverrides), 'nav') }
			: {},
	);
	const state = createInternalState(loadout, overrides);
	return new NavigationSystem(state, loadout);
}

describe('NavigationSystem', () => {
	it('getSkill returns nav mult_a', () => {
		expect(createNavSystem().getSkill()).toBe(0.8);
	});

	it('getEfficiency returns nav mult_b', () => {
		expect(createNavSystem().getEfficiency()).toBe(0.9);
	});

	it('getCurrentPosition returns nodeId from state', () => {
		expect(createNavSystem().getCurrentPosition()).toBeNull();
		expect(createNavSystem({ nodeId: 42 }).getCurrentPosition()).toBe(42);
	});

	it('getDiscoveryProbability at depth 0', () => {
		// skill=0.8, efficiency=0.9, depth=0, decay=0.9
		// 0.8 * 0.9 * 0.9^0 = 0.72
		const sys = createNavSystem();
		expect(sys.getDiscoveryProbability(0)).toBeCloseTo(0.72);
	});

	it('getDiscoveryProbability decays with depth', () => {
		const sys = createNavSystem();
		const p0 = sys.getDiscoveryProbability(0);
		const p1 = sys.getDiscoveryProbability(1);
		const p5 = sys.getDiscoveryProbability(5);
		expect(p1).toBeLessThan(p0);
		expect(p5).toBeLessThan(p1);
	});

	it('discovery probability is capped at 1.0', () => {
		// High skill and efficiency
		const sys = createNavSystem({}, { mult_a: 2.0, mult_b: 2.0 });
		expect(sys.getDiscoveryProbability(0)).toBe(1.0);
	});
});
