import { describe, it, expect } from 'vitest';
import { PowerSystem } from '../systems/power';
import { createInternalState } from '../state';
import { makeLoadout, makeComponent, makeCore } from './helpers';
import { PowerMode } from '../enums/power-mode';

function createPowerSystem(
	overrides: Parameters<typeof createInternalState>[1] = {},
	coreOverrides: Record<string, unknown> = {},
) {
	const loadout = makeLoadout(
		Object.keys(coreOverrides).length
			? { core: makeComponent(makeCore(coreOverrides), 'core') }
			: {},
	);
	const state = createInternalState(loadout, overrides);
	return new PowerSystem(state, loadout);
}

describe('PowerSystem', () => {
	describe('getCurrentPower', () => {
		it('returns max when powerFullAt is null', () => {
			const sys = createPowerSystem();
			expect(sys.getCurrentPower(0)).toBe(100);
		});

		it('returns max when powerFullAt is in the past', () => {
			const sys = createPowerSystem({ powerFullAt: 100 });
			expect(sys.getCurrentPower(200)).toBe(100);
		});

		it('returns partial power based on timestamp', () => {
			// Core: rate=10/hr, normal regen mult=1.0, capacity=100
			// powerFullAt = 3600 (1 hour from now=0)
			// deficit = 1 hour * 10/hr = 10
			// current = 100 - 10 = 90
			const sys = createPowerSystem({ powerFullAt: 3600 });
			expect(sys.getCurrentPower(0)).toBe(90);
		});

		it('returns 0 when deficit exceeds max', () => {
			// 100 hours until full, rate=10 → deficit=1000, clamped to 0
			const sys = createPowerSystem({ powerFullAt: 360000 });
			expect(sys.getCurrentPower(0)).toBe(0);
		});
	});

	describe('getRegenRate', () => {
		it('normal mode: base rate * 1.0', () => {
			const sys = createPowerSystem();
			expect(sys.getRegenRate()).toBe(10);
		});

		it('efficiency mode: base rate * 0.5', () => {
			const sys = createPowerSystem({ powerMode: PowerMode.Efficiency });
			expect(sys.getRegenRate()).toBe(5);
		});

		it('overdrive mode: base rate * 1.3', () => {
			const sys = createPowerSystem({ powerMode: PowerMode.Overdrive });
			expect(sys.getRegenRate()).toBe(13);
		});
	});

	describe('getOutputMultiplier', () => {
		it('normal mode: core output * 1.0', () => {
			const sys = createPowerSystem();
			expect(sys.getOutputMultiplier()).toBe(1.0);
		});

		it('overdrive: core output * 1.3', () => {
			const sys = createPowerSystem({ powerMode: PowerMode.Overdrive });
			expect(sys.getOutputMultiplier()).toBeCloseTo(1.3);
		});

		it('efficiency: core output * 0.7', () => {
			const sys = createPowerSystem({ powerMode: PowerMode.Efficiency });
			expect(sys.getOutputMultiplier()).toBeCloseTo(0.7);
		});
	});

	describe('getDecayMultiplier', () => {
		it('normal mode: 1.0', () => {
			expect(createPowerSystem().getDecayMultiplier()).toBe(1.0);
		});

		it('efficiency mode: 0.0', () => {
			expect(
				createPowerSystem({ powerMode: PowerMode.Efficiency }).getDecayMultiplier(),
			).toBe(0.0);
		});

		it('overdrive mode: 2.5', () => {
			expect(
				createPowerSystem({ powerMode: PowerMode.Overdrive }).getDecayMultiplier(),
			).toBe(2.5);
		});
	});

	describe('hasAvailable', () => {
		it('true when enough power', () => {
			const sys = createPowerSystem();
			expect(sys.hasAvailable(50, 0)).toBe(true);
		});

		it('false when insufficient', () => {
			const sys = createPowerSystem({ powerFullAt: 36000 });
			expect(sys.hasAvailable(100, 0)).toBe(false);
		});
	});

	describe('core life', () => {
		it('getCoreLife returns core life from state', () => {
			const sys = createPowerSystem({ coreLife: 250 });
			expect(sys.getCoreLife()).toBe(250);
		});

		it('isDepleted when core life is 0', () => {
			expect(createPowerSystem({ coreLife: 0 }).isDepleted()).toBe(true);
			expect(createPowerSystem({ coreLife: 1 }).isDepleted()).toBe(false);
		});
	});

	describe('calculatePowerFullAtAfterConsumption', () => {
		it('returns future timestamp after consuming power', () => {
			// At max (100), consume 50 → deficit 50, rate 10/hr
			// hoursToFull = 50/10 = 5, seconds = 18000
			const sys = createPowerSystem();
			const fullAt = sys.calculatePowerFullAtAfterConsumption(50, 0);
			expect(fullAt).toBe(18000);
		});

		it('returns null when consumption would not create deficit', () => {
			const sys = createPowerSystem();
			expect(sys.calculatePowerFullAtAfterConsumption(0, 0)).toBeNull();
		});
	});
});
