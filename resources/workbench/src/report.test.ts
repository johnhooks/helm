import { describe, it, expect } from 'vitest';
import type { ActionTuning } from '@helm/formulas';
import { DEFAULT_CONSTANTS, DEFAULT_TUNING } from '@helm/formulas';
import type { Loadout, WorkbenchProduct } from './types';
import { computeShipReport } from './report';

const epochS: WorkbenchProduct = {
	id: 1, slug: 'epoch_s', type: 'core', label: 'Epoch-S Standard', version: 1,
	footprint: 25, hp: 750, rate: 10.0, sustain: null, capacity: null,
	chance: null, mult_a: 1.0, mult_b: 1.0, mult_c: null,
	draw: null, tuning: null,
};

const dr505: WorkbenchProduct = {
	id: 2, slug: 'dr_505', type: 'drive', label: 'DR-505 Standard', version: 1,
	footprint: 30, hp: null, rate: null, sustain: 7.0, capacity: null,
	chance: null, mult_a: 1.0, mult_b: 1.0, mult_c: 1.0,
	draw: 4.0, tuning: { param: 'throttle', min: 0.5, max: 2.0 },
};

const vrsMk1: WorkbenchProduct = {
	id: 3, slug: 'vrs_mk1', type: 'sensor', label: 'VRS Mk I', version: 1,
	footprint: 25, hp: null, rate: null, sustain: 5.0, capacity: null,
	chance: 0.7, mult_a: 1.0, mult_b: null, mult_c: null,
	draw: 2.0, tuning: { param: 'effort', min: 0.25, max: 2.0 },
};

const aegisBeta: WorkbenchProduct = {
	id: 4, slug: 'aegis_beta', type: 'shield', label: 'Aegis Beta', version: 1,
	footprint: 20, hp: null, rate: 10.0, sustain: null, capacity: 100.0,
	chance: null, mult_a: null, mult_b: null, mult_c: null,
	draw: 5.0, tuning: { param: 'priority', min: 0.5, max: 2.0 },
};

const navTier3: WorkbenchProduct = {
	id: 5, slug: 'nav_tier_3', type: 'nav', label: 'Nav Computer Tier 3', version: 1,
	footprint: 0, hp: null, rate: null, sustain: null, capacity: null,
	chance: null, mult_a: 0.6, mult_b: 0.7, mult_c: null,
	draw: null, tuning: null,
};

const pioneer = {
	slug: 'pioneer', label: 'Pioneer Frame', internalSpace: 300,
	hullIntegrity: 100, powerMax: 100, shieldsMax: 100,
	slots: ['core', 'drive', 'sensor', 'shield', 'nav'] as const,
	equipmentSlots: 3,
};

const defaultLoadout: Loadout = {
	hull: pioneer,
	core: epochS,
	drive: dr505,
	sensor: vrsMk1,
	shield: aegisBeta,
	nav: navTier3,
};

describe('computeShipReport', () => {
	describe('no fields are empty or zero when they should have values', () => {
		const report = computeShipReport(defaultLoadout, DEFAULT_TUNING, DEFAULT_CONSTANTS);

		it('footprint has all component values', () => {
			expect(report.footprint.breakdown.core).toBe(25);
			expect(report.footprint.breakdown.drive).toBe(30);
			expect(report.footprint.breakdown.sensor).toBe(25);
			expect(report.footprint.breakdown.shield).toBe(20);
			expect(report.footprint.breakdown.nav).toBe(0); // nav has 0 footprint, valid
			expect(report.footprint.total).toBe(100);
			expect(report.footprint.budget).toBe(300);
			expect(report.footprint.cargo).toBe(200);
		});

		it('power has all non-zero values', () => {
			expect(report.power.coreOutput).toBe(1.0);
			expect(report.power.capacitor).toBe(100);
			expect(report.power.perfRatio).toBe(1.0);
			expect(report.power.regenRate).toBe(10.0);
			expect(report.power.coreLife).toBe(750);
		});

		it('scan has all non-zero values', () => {
			expect(report.scan.comfortRange).toBe(5.0);
			expect(report.scan.powerCostPerLy).toBe(2.0);
			expect(report.scan.durationPerLy).toBe(30);
			expect(report.scan.successChance).toBe(0.7);
			expect(report.scan.sampleScans.length).toBeGreaterThan(0);

			for (const s of report.scan.sampleScans) {
				expect(s.distance).toBeGreaterThan(0);
				expect(s.cost).toBeGreaterThan(0);
				expect(s.duration).toBeGreaterThan(0);
				expect(s.strain).toBeGreaterThanOrEqual(1.0);
				expect(s.chance).toBeGreaterThan(0);
				expect(s.chance).toBeLessThanOrEqual(0.7);
			}
		});

		it('jump has all non-zero values', () => {
			expect(report.jump.comfortRange).toBe(7.0);
			expect(report.jump.coreCostPerLy).toBe(1.0);
			expect(report.jump.powerCostPerLy).toBe(8.0);
			expect(report.jump.sampleJumps.length).toBeGreaterThan(0);

			for (const j of report.jump.sampleJumps) {
				expect(j.distance).toBeGreaterThan(0);
				expect(j.duration).toBeGreaterThan(0);
				expect(j.coreCost).toBeGreaterThan(0);
				expect(j.powerCost).toBeGreaterThan(0);
				expect(j.strain).toBeGreaterThanOrEqual(1.0);
			}
		});

		it('samples within comfort have strain 1.0 and full chance', () => {
			const withinComfortJumps = report.jump.sampleJumps.filter((j) => j.distance <= 7);
			expect(withinComfortJumps.length).toBeGreaterThan(0);
			for (const j of withinComfortJumps) {
				expect(j.strain).toBe(1.0);
			}

			const withinComfortScans = report.scan.sampleScans.filter((s) => s.distance <= 5);
			expect(withinComfortScans.length).toBeGreaterThan(0);
			for (const s of withinComfortScans) {
				expect(s.strain).toBe(1.0);
				expect(s.chance).toBe(0.7);
			}
		});

		it('samples past comfort have strain > 1.0 and reduced chance', () => {
			const pastComfortJumps = report.jump.sampleJumps.filter((j) => j.distance > 7);
			expect(pastComfortJumps.length).toBeGreaterThan(0);
			for (const j of pastComfortJumps) {
				expect(j.strain).toBeGreaterThan(1.0);
			}

			const pastComfortScans = report.scan.sampleScans.filter((s) => s.distance > 5);
			expect(pastComfortScans.length).toBeGreaterThan(0);
			for (const s of pastComfortScans) {
				expect(s.strain).toBeGreaterThan(1.0);
				expect(s.chance).toBeLessThan(0.7);
			}
		});

		it('shields has all non-zero values', () => {
			expect(report.shield.capacity).toBe(100);
			expect(report.shield.regenRate).toBe(10.0);
			expect(report.shield.draw).toBe(5.0);
			expect(report.shield.timeToFull).toBe(36000); // (100/10)*3600
		});

		it('nav has all non-zero values', () => {
			expect(report.nav.skill).toBe(0.6);
			expect(report.nav.efficiency).toBe(0.7);
			expect(report.nav.discoveryByDepth.length).toBe(6);

			for (const d of report.nav.discoveryByDepth) {
				expect(d.probability).toBeGreaterThan(0);
				expect(d.probability).toBeLessThanOrEqual(1.0);
			}
		});
	});

	describe('tuning affects the right fields', () => {
		const reportDefault = computeShipReport(defaultLoadout, DEFAULT_TUNING, DEFAULT_CONSTANTS);

		it('low throttle: core cost 0, slower jumps, scan/shield unchanged', () => {
			const tuning: ActionTuning = { ...DEFAULT_TUNING, throttle: 0.5 };
			const report = computeShipReport(defaultLoadout, tuning, DEFAULT_CONSTANTS);

			expect(report.jump.coreCostPerLy).toBe(0);
			for (const j of report.jump.sampleJumps) {
				expect(j.coreCost).toBe(0);
			}
			// Duration should be longer (throttle 0.5 = 2x duration)
			expect(report.jump.sampleJumps[0].duration).toBe(reportDefault.jump.sampleJumps[0].duration * 2);

			// Scan and shield unchanged
			expect(report.scan.durationPerLy).toBe(reportDefault.scan.durationPerLy);
			expect(report.shield.regenRate).toBe(reportDefault.shield.regenRate);
		});

		it('high throttle: higher core cost, faster jumps', () => {
			const tuning: ActionTuning = { ...DEFAULT_TUNING, throttle: 2.0 };
			const report = computeShipReport(defaultLoadout, tuning, DEFAULT_CONSTANTS);

			expect(report.jump.coreCostPerLy).toBe(2.0);
			// Duration should be shorter (throttle 2.0 = 0.5x duration)
			expect(report.jump.sampleJumps[0].duration).toBe(reportDefault.jump.sampleJumps[0].duration / 2);
		});

		it('high effort: longer scans, better chance past comfort', () => {
			const tuning: ActionTuning = { ...DEFAULT_TUNING, effort: 2.0 };
			const report = computeShipReport(defaultLoadout, tuning, DEFAULT_CONSTANTS);

			// Duration doubles
			expect(report.scan.durationPerLy).toBe(reportDefault.scan.durationPerLy * 2);

			// Chance within comfort is still capped at base
			const withinComfort = report.scan.sampleScans.filter((s) => s.distance <= 5);
			for (const s of withinComfort) {
				expect(s.chance).toBe(0.7);
			}

			// Jump and shield unchanged
			expect(report.jump.coreCostPerLy).toBe(reportDefault.jump.coreCostPerLy);
			expect(report.shield.regenRate).toBe(reportDefault.shield.regenRate);
		});

		it('high priority: faster shield regen, higher draw', () => {
			const tuning: ActionTuning = { ...DEFAULT_TUNING, priority: 2.0 };
			const report = computeShipReport(defaultLoadout, tuning, DEFAULT_CONSTANTS);

			expect(report.shield.regenRate).toBe(20.0); // 10.0 * 2.0
			expect(report.shield.draw).toBe(10.0); // 5.0 * 2.0
			expect(report.shield.timeToFull).toBe(18000); // (100/20)*3600

			// Jump and scan unchanged
			expect(report.jump.coreCostPerLy).toBe(reportDefault.jump.coreCostPerLy);
			expect(report.scan.durationPerLy).toBe(reportDefault.scan.durationPerLy);
		});

		it('tuning does not change footprint', () => {
			const tuning: ActionTuning = { effort: 2.0, throttle: 2.0, priority: 2.0 };
			const report = computeShipReport(defaultLoadout, tuning, DEFAULT_CONSTANTS);
			expect(report.footprint.total).toBe(reportDefault.footprint.total);
		});

		it('tuning does not change nav', () => {
			const tuning: ActionTuning = { effort: 2.0, throttle: 2.0, priority: 2.0 };
			const report = computeShipReport(defaultLoadout, tuning, DEFAULT_CONSTANTS);
			expect(report.nav.skill).toBe(reportDefault.nav.skill);
		});
	});

	describe('underpowered loadout', () => {
		const dr705: WorkbenchProduct = {
			id: 6, slug: 'dr_705', type: 'drive', label: 'DR-705', version: 1,
			footprint: 45, hp: null, rate: null, sustain: 5.0, capacity: null,
			chance: null, mult_a: 2.0, mult_b: 1.5, mult_c: 2.0,
			draw: 8.0, tuning: { param: 'throttle', min: 0.5, max: 3.0 },
		};

		const loadout: Loadout = { ...defaultLoadout, drive: dr705 };
		const report = computeShipReport(loadout, DEFAULT_TUNING, DEFAULT_CONSTANTS);

		it('perfRatio is below 1.0', () => {
			// output 1.0 / consumption 1.5 = 0.667
			expect(report.power.perfRatio).toBeCloseTo(0.667, 2);
			expect(report.power.perfRatio).toBeLessThan(1.0);
		});

		it('jump comfort range is reduced by perf ratio', () => {
			// sustain 5.0 * output 1.0 * perf 0.667 = 3.333
			expect(report.jump.comfortRange).toBeCloseTo(3.333, 2);
		});

		it('still produces valid sample data', () => {
			expect(report.jump.sampleJumps.length).toBeGreaterThan(0);
			for (const j of report.jump.sampleJumps) {
				expect(j.duration).toBeGreaterThan(0);
				expect(isFinite(j.duration)).toBe(true);
			}
		});
	});
});
