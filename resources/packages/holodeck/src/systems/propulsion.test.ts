import { describe, it, expect } from 'vitest';
import { PropulsionSystem } from './propulsion';
import { PowerSystem } from './power';
import { createInternalState } from '../state';
import { makeLoadout } from '../test-helpers';
import type { Constants } from '@helm/formulas';

function createPropulsionSystem(
	overrides: Parameters<typeof createInternalState>[1] = {},
	constants?: Constants,
) {
	const loadout = makeLoadout();
	const state = createInternalState(loadout, overrides);
	const power = new PowerSystem(state, loadout);
	return { sys: new PropulsionSystem(state, loadout, power, constants), power, state };
}

describe('PropulsionSystem', () => {
	it('getPerformanceRatio delegates to perfRatio formula', () => {
		// coreOutput=1.0 → output=1.0
		// drive.mult_b=1.0 → perfRatio = min(1.0, 1.0/1.0) = 1.0
		const { sys } = createPropulsionSystem();
		expect(sys.getPerformanceRatio()).toBe(1.0);
	});

	it('getComfortRange delegates to jumpComfortRange formula', () => {
		// drive.sustain=5, output=1.0, perfRatio=1.0 → 5*1.0*1.0 = 5
		const { sys } = createPropulsionSystem();
		expect(sys.getComfortRange()).toBe(5);
	});

	it('getJumpDuration computes travel time with explicit throttle', () => {
		// 5 ly at comfort range, throttle=1.0
		// amplitude = drive.mult_c(0.8) * output(1.0) * perf(1.0) = 0.8
		// effective = 0.8 * throttle(1.0) = 0.8
		// duration = ceil(5 * 3600 / 0.8) = ceil(22500) = 22500
		const { sys } = createPropulsionSystem();
		expect(sys.getJumpDuration(5, 1.0)).toBe(22500);
	});

	it('getJumpCoreCost scales with distance and throttle', () => {
		const { sys } = createPropulsionSystem();
		const cost5 = sys.getJumpCoreCost(5, 1.0);
		const cost10 = sys.getJumpCoreCost(10, 1.0);
		expect(cost10).toBeGreaterThan(cost5);
	});

	it('getJumpPowerCost scales with distance', () => {
		const { sys } = createPropulsionSystem();
		const cost = sys.getJumpPowerCost(5);
		// 5 * 8.0 * strainFactor(5, 5) = 5 * 8 * 1.0 = 40
		expect(cost).toBe(40);
	});

	it('canReach checks core life against cost', () => {
		// Default core life = 500 (from makeCore hp)
		const { sys } = createPropulsionSystem();
		expect(sys.canReach(5, 1.0)).toBe(true);
	});

	it('canReach false when core life insufficient', () => {
		const { sys } = createPropulsionSystem({ coreLife: 0 });
		expect(sys.canReach(5, 1.0)).toBe(false);
	});
});
