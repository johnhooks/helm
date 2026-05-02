/**
 * Contract tests driven by shared JSON fixtures.
 *
 * The same fixtures run in PHP (ContractTest.php) to verify parity.
 * Cases with skip_ts=true test PHP-only features (PowerMode).
 */
import { describe, it, expect } from 'vitest';
import type { FixtureCase } from './contract-helpers';
import { systemsFromFixture } from './contract-helpers';

import powerFixtures from '../../../../../tests/_data/fixtures/ship-state/power.json';
import shieldFixtures from '../../../../../tests/_data/fixtures/ship-state/shields.json';
import propulsionFixtures from '../../../../../tests/_data/fixtures/ship-state/propulsion.json';
import sensorFixtures from '../../../../../tests/_data/fixtures/ship-state/sensors.json';
import combinedFixtures from '../../../../../tests/_data/fixtures/ship-state/combined.json';

function runCases(
	fixtures: FixtureCase[],
	runner: (fixture: FixtureCase) => void
) {
	fixtures
		.filter((f) => !f.skip_ts)
		.forEach((fixture) => {
			it(fixture.label, () => runner(fixture));
		});
}

describe('contract: power', () => {
	runCases(powerFixtures as FixtureCase[], (fixture) => {
		const { power } = systemsFromFixture(fixture);
		const now = fixture.now ?? 0;
		const expected = fixture.expected;

		if (expected.currentPower !== undefined) {
			expect(power.getCurrentPower(now)).toBeCloseTo(
				expected.currentPower,
				1
			);
		}
		if (expected.regenRate !== undefined) {
			expect(power.getRegenRate()).toBeCloseTo(expected.regenRate, 1);
		}
		if (expected.outputMultiplier !== undefined) {
			expect(power.getOutputMultiplier()).toBeCloseTo(
				expected.outputMultiplier,
				1
			);
		}
	});
});

describe('contract: shields', () => {
	runCases(shieldFixtures as FixtureCase[], (fixture) => {
		const { shields } = systemsFromFixture(fixture);
		const now = fixture.now ?? 0;
		const expected = fixture.expected;

		if (expected.currentStrength !== undefined) {
			expect(shields.getCurrentStrength(now)).toBeCloseTo(
				expected.currentStrength,
				1
			);
		}
		if (expected.regenRate !== undefined) {
			expect(shields.getRegenRate()).toBeCloseTo(expected.regenRate, 1);
		}
	});
});

describe('contract: propulsion', () => {
	runCases(propulsionFixtures as FixtureCase[], (fixture) => {
		const { propulsion } = systemsFromFixture(fixture);
		const distance = fixture.distance ?? 0;
		const expected = fixture.expected;

		if (expected.jumpDuration !== undefined) {
			expect(propulsion.getJumpDuration(distance)).toBeCloseTo(
				expected.jumpDuration,
				0
			);
		}
		if (expected.coreCost !== undefined) {
			expect(propulsion.getJumpCoreCost(distance)).toBeCloseTo(
				expected.coreCost,
				1
			);
		}
		if (expected.performanceRatio !== undefined) {
			expect(propulsion.getPerformanceRatio()).toBeCloseTo(
				expected.performanceRatio,
				1
			);
		}
		if (expected.maxRange !== undefined) {
			expect(propulsion.getComfortRange()).toBeCloseTo(
				expected.maxRange,
				1
			);
		}
	});
});

describe('contract: sensors', () => {
	runCases(sensorFixtures as FixtureCase[], (fixture) => {
		const { sensors } = systemsFromFixture(fixture);
		const distance = fixture.distance ?? 0;
		const expected = fixture.expected;

		if (expected.range !== undefined) {
			expect(sensors.getRange()).toBeCloseTo(expected.range, 1);
		}
		if (expected.scanDuration !== undefined) {
			expect(sensors.getScanDuration(distance)).toBeCloseTo(
				expected.scanDuration,
				0
			);
		}
		if (expected.scanCost !== undefined) {
			expect(sensors.getScanPowerCost(distance)).toBeCloseTo(
				expected.scanCost,
				1
			);
		}
	});
});

describe('contract: combined', () => {
	runCases(combinedFixtures as FixtureCase[], (fixture) => {
		const { power, shields, propulsion, sensors } =
			systemsFromFixture(fixture);
		const now = fixture.now ?? 0;
		const distance = fixture.distance ?? 0;
		const expected = fixture.expected;

		if (expected.currentPower !== undefined) {
			expect(power.getCurrentPower(now)).toBeCloseTo(
				expected.currentPower,
				1
			);
		}
		if (expected.regenRate !== undefined) {
			expect(power.getRegenRate()).toBeCloseTo(expected.regenRate, 1);
		}
		if (expected.outputMultiplier !== undefined) {
			expect(power.getOutputMultiplier()).toBeCloseTo(
				expected.outputMultiplier,
				1
			);
		}
		if (expected.currentStrength !== undefined) {
			expect(shields.getCurrentStrength(now)).toBeCloseTo(
				expected.currentStrength,
				1
			);
		}
		if (expected.jumpDuration !== undefined) {
			expect(propulsion.getJumpDuration(distance)).toBeCloseTo(
				expected.jumpDuration,
				0
			);
		}
		if (expected.coreCost !== undefined) {
			expect(propulsion.getJumpCoreCost(distance)).toBeCloseTo(
				expected.coreCost,
				1
			);
		}
		if (expected.maxRange !== undefined) {
			expect(propulsion.getComfortRange()).toBeCloseTo(
				expected.maxRange,
				1
			);
		}
		if (expected.range !== undefined) {
			expect(sensors.getRange()).toBeCloseTo(expected.range, 1);
		}
	});
});
