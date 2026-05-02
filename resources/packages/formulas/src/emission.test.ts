import { describe, it, expect } from 'vitest';
import { DEFAULT_EMISSION_PROFILES } from './types';
import { emissionPower, tunedEmission } from './emission';

describe('emissionPower', () => {
	it('returns base profile power at default component stat', () => {
		expect(emissionPower('pnp_scan')).toBe(5.0);
		expect(emissionPower('mining')).toBe(1.0);
		expect(emissionPower('idle')).toBe(0.0);
	});

	it('scales by component stat', () => {
		// A Mk II sensor with 1.3x emission multiplier
		expect(emissionPower('pnp_scan', 1.3)).toBeCloseTo(6.5);
	});

	it('accepts custom profiles', () => {
		const custom = {
			...DEFAULT_EMISSION_PROFILES,
			mining: { base: 3.0, spectralType: 'continuous' as const },
		};
		expect(emissionPower('mining', 1.0, custom)).toBe(3.0);
	});

	it('ranks emissions in expected order', () => {
		const weapons = emissionPower('weapons_fire');
		const pnp = emissionPower('pnp_scan');
		const driveSpool = emissionPower('drive_spool');
		const mining = emissionPower('mining');
		const shieldRegen = emissionPower('shield_regen');
		const idle = emissionPower('idle');

		// Weapons fire is the loudest thing in the game
		expect(weapons).toBeGreaterThan(pnp);
		// PNP scan is very loud
		expect(pnp).toBeGreaterThan(driveSpool);
		// Mining is moderate
		expect(mining).toBeGreaterThan(shieldRegen);
		// Shield regen is barely detectable
		expect(shieldRegen).toBeGreaterThan(idle);
		// Idle is silent
		expect(idle).toBe(0);
	});

	it('planet scan is quieter than system survey', () => {
		expect(emissionPower('planet_scan')).toBeLessThan(
			emissionPower('system_survey')
		);
	});

	it('drive spool is louder than sustain which is louder than cooldown', () => {
		const spool = emissionPower('drive_spool');
		const sustain = emissionPower('drive_sustain');
		const cooldown = emissionPower('drive_cooldown');

		expect(spool).toBeGreaterThan(sustain);
		expect(sustain).toBeGreaterThan(cooldown);
	});
});

describe('tunedEmission', () => {
	it('returns base emission at default tuning', () => {
		expect(tunedEmission(5.0)).toBe(5.0);
	});

	it('scales linearly with tuning value', () => {
		expect(tunedEmission(5.0, 2.0)).toBe(10.0);
		expect(tunedEmission(5.0, 0.5)).toBe(2.5);
	});

	it('zero tuning silences the emission', () => {
		expect(tunedEmission(5.0, 0)).toBe(0);
	});

	it('composing with emissionPower produces expected values', () => {
		// PNP scan at effort 2.0 with a Mk II sensor (1.2x)
		const base = emissionPower('pnp_scan', 1.2);
		const tuned = tunedEmission(base, 2.0);
		// 5.0 * 1.2 * 2.0 = 12.0
		expect(tuned).toBeCloseTo(12.0);
	});
});
