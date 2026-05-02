import { describe, it, expect } from 'vitest';
import { ShieldSystem } from './shields';
import { createInternalState } from '../state';
import { makeLoadout, makeComponent, makeShield } from '../test-helpers';

function createShieldSystem(
	overrides: Parameters<typeof createInternalState>[1] = {},
	shieldOverrides: Record<string, unknown> = {}
) {
	const loadout = makeLoadout(
		Object.keys(shieldOverrides).length
			? { shield: makeComponent(makeShield(shieldOverrides), 'shield') }
			: {}
	);
	const state = createInternalState(loadout, overrides);
	return new ShieldSystem(state, loadout);
}

describe('ShieldSystem', () => {
	describe('getCurrentStrength', () => {
		it('returns max when shieldsFullAt is null', () => {
			const sys = createShieldSystem();
			// shieldsMax = capacity(50) * hull.shieldCapacityMultiplier(undefined → 1.0) = 50
			expect(sys.getCurrentStrength(0)).toBe(50);
		});

		it('returns max when shieldsFullAt is in the past', () => {
			const sys = createShieldSystem({ shieldsFullAt: 100 });
			expect(sys.getCurrentStrength(200)).toBe(50);
		});

		it('returns partial strength based on timestamp', () => {
			// Shield: rate=5/hr, priority=1.0, regenRate=5/hr
			// shieldsFullAt = 3600 (1 hour), now=0 → deficit = 1hr * 5/hr = 5
			// current = 50 - 5 = 45
			const sys = createShieldSystem({ shieldsFullAt: 3600 });
			expect(sys.getCurrentStrength(0)).toBe(45);
		});

		it('clamps to 0', () => {
			// 100 hours until full, rate=5 → deficit=500, clamped to 0
			const sys = createShieldSystem({ shieldsFullAt: 360000 });
			expect(sys.getCurrentStrength(0)).toBe(0);
		});
	});

	describe('getRegenRate', () => {
		it('base rate * priority', () => {
			const sys = createShieldSystem();
			expect(sys.getRegenRate()).toBe(5);
		});

		it('scales with shield priority', () => {
			const sys = createShieldSystem({ shieldPriority: 2.0 });
			expect(sys.getRegenRate()).toBe(10);
		});
	});

	describe('getMaxStrength', () => {
		it('returns shieldsMax from state', () => {
			expect(createShieldSystem().getMaxStrength()).toBe(50);
		});
	});

	describe('isDepleted', () => {
		it('false when shields have strength', () => {
			expect(createShieldSystem().isDepleted(0)).toBe(false);
		});

		it('true when shields are at 0', () => {
			const sys = createShieldSystem({ shieldsFullAt: 360000 });
			expect(sys.isDepleted(0)).toBe(true);
		});
	});

	describe('calculateShieldsFullAtAfterDamage', () => {
		it('computes recovery timestamp', () => {
			// At max (50), take 25 damage → deficit 25, rate 5/hr
			// hoursToFull = 25/5 = 5, seconds = 18000
			const sys = createShieldSystem();
			const fullAt = sys.calculateShieldsFullAtAfterDamage(25, 0);
			expect(fullAt).toBe(18000);
		});

		it('returns null when no damage taken', () => {
			const sys = createShieldSystem();
			expect(sys.calculateShieldsFullAtAfterDamage(0, 0)).toBeNull();
		});
	});

	describe('calculateDamageAbsorption', () => {
		it('absorbs all damage when shields are strong enough', () => {
			const sys = createShieldSystem();
			const result = sys.calculateDamageAbsorption(30, 0);
			expect(result).toEqual({ absorbed: 30, overflow: 0 });
		});

		it('overflows when shields are insufficient', () => {
			const sys = createShieldSystem();
			const result = sys.calculateDamageAbsorption(70, 0);
			expect(result).toEqual({ absorbed: 50, overflow: 20 });
		});

		it('all damage overflows when shields are depleted', () => {
			const sys = createShieldSystem({ shieldsFullAt: 360000 });
			const result = sys.calculateDamageAbsorption(30, 0);
			expect(result).toEqual({ absorbed: 0, overflow: 30 });
		});
	});
});
