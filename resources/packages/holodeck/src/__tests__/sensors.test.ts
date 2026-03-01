import { describe, it, expect } from 'vitest';
import { SensorSystem } from '../systems/sensors';
import { PowerSystem } from '../systems/power';
import { createInternalState } from '../state';
import { makeLoadout } from './helpers';

function createSensorSystem(
	overrides: Parameters<typeof createInternalState>[1] = {},
) {
	const loadout = makeLoadout();
	const state = createInternalState(loadout, overrides);
	const power = new PowerSystem(state, loadout);
	return new SensorSystem(state, loadout, power);
}

describe('SensorSystem', () => {
	it('getRange = sustain * output multiplier', () => {
		// sensor.sustain=8, output=1.0 (normal mode) → 8
		const sys = createSensorSystem();
		expect(sys.getRange()).toBe(8);
	});

	it('getComfortRange = scanComfortRange * hull multiplier', () => {
		// scanComfortRange(sensor, output) = sustain(8) * output(1.0) = 8
		// Pioneer hull has no scanComfortMultiplier → default 1.0
		// comfortRange = 8 * 1.0 = 8
		const sys = createSensorSystem();
		expect(sys.getComfortRange()).toBe(8);
	});

	it('canScan within range', () => {
		const sys = createSensorSystem();
		expect(sys.canScan(5)).toBe(true);
		expect(sys.canScan(8)).toBe(true);
		expect(sys.canScan(9)).toBe(false);
	});

	it('getScanPowerCost scales with distance', () => {
		const sys = createSensorSystem();
		const cost3 = sys.getScanPowerCost(3);
		const cost6 = sys.getScanPowerCost(6);
		expect(cost6).toBeGreaterThan(cost3);
	});

	it('getScanPowerCost at comfort range has no strain', () => {
		const sys = createSensorSystem();
		// 8 ly * baseScanPowerPerLy(2.0) * strain(1.0) = 16
		expect(sys.getScanPowerCost(8)).toBe(16);
	});

	it('getScanDuration scales with distance and effort', () => {
		const sys = createSensorSystem();
		// 5 ly * baseScanSecondsPerLy(30) * sensor.mult_a(1.0) * effort(1.0) = 150
		expect(sys.getScanDuration(5)).toBe(150);
	});

	it('getScanSuccessChance returns base chance within comfort', () => {
		const sys = createSensorSystem();
		// Within comfort, strain=1.0, effort=1.0
		// min(base, (base/1.0)*1.0) = min(0.85, 0.85) = 0.85
		expect(sys.getScanSuccessChance(5)).toBe(0.85);
	});

	it('getScanSuccessChance degrades beyond comfort range', () => {
		const sys = createSensorSystem();
		const chanceNear = sys.getScanSuccessChance(5);
		// Beyond comfort range (8), strain > 1.0 reduces chance
		// But sensor range is 8, and at exactly 8 strain=1.0
		// We need to check an impossible scan > range — strain will apply
		const chanceFar = sys.getScanSuccessChance(12);
		expect(chanceFar).toBeLessThan(chanceNear);
	});
});
