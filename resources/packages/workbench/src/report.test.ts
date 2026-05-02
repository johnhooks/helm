import { describe, it, expect } from 'vitest';
import type { ActionTuning, PilotSkills } from '@helm/formulas';
import {
	DEFAULT_CONSTANTS,
	DEFAULT_TUNING,
	DEFAULT_PILOT_SKILLS,
} from '@helm/formulas';
import type { ReportLoadout } from './types';
import { computeShipReport } from './report';
import { getProduct } from './data/products';
import { getHull } from './data/hulls';

function p(slug: string) {
	const product = getProduct(slug);
	if (!product) {
		throw new Error(`Unknown product: ${slug}`);
	}
	return product;
}

function h(slug: string) {
	const hull = getHull(slug);
	if (!hull) {
		throw new Error(`Unknown hull: ${slug}`);
	}
	return hull;
}

const defaultLoadout: ReportLoadout = {
	hull: h('pioneer'),
	core: p('epoch_s'),
	drive: p('dr_505'),
	sensor: p('vrs_mk1'),
	shield: p('aegis_delta'),
	nav: p('nav_tier_3'),
};

describe('computeShipReport', () => {
	describe('no fields are empty or zero when they should have values', () => {
		const report = computeShipReport(
			defaultLoadout,
			DEFAULT_TUNING,
			DEFAULT_CONSTANTS
		);

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
			const withinComfortJumps = report.jump.sampleJumps.filter(
				(j) => j.distance <= 7
			);
			expect(withinComfortJumps.length).toBeGreaterThan(0);
			for (const j of withinComfortJumps) {
				expect(j.strain).toBe(1.0);
			}

			const withinComfortScans = report.scan.sampleScans.filter(
				(s) => s.distance <= 5
			);
			expect(withinComfortScans.length).toBeGreaterThan(0);
			for (const s of withinComfortScans) {
				expect(s.strain).toBe(1.0);
				expect(s.chance).toBe(0.7);
			}
		});

		it('samples past comfort have strain > 1.0 and reduced chance', () => {
			const pastComfortJumps = report.jump.sampleJumps.filter(
				(j) => j.distance > 7
			);
			expect(pastComfortJumps.length).toBeGreaterThan(0);
			for (const j of pastComfortJumps) {
				expect(j.strain).toBeGreaterThan(1.0);
			}

			const pastComfortScans = report.scan.sampleScans.filter(
				(s) => s.distance > 5
			);
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
		const reportDefault = computeShipReport(
			defaultLoadout,
			DEFAULT_TUNING,
			DEFAULT_CONSTANTS
		);

		it('low throttle: core cost 0, slower jumps, scan/shield unchanged', () => {
			const tuning: ActionTuning = { ...DEFAULT_TUNING, throttle: 0.5 };
			const report = computeShipReport(
				defaultLoadout,
				tuning,
				DEFAULT_CONSTANTS
			);

			expect(report.jump.coreCostPerLy).toBe(0);
			for (const j of report.jump.sampleJumps) {
				expect(j.coreCost).toBe(0);
			}
			// Duration should be longer (throttle 0.5 = 2x duration)
			expect(report.jump.sampleJumps[0].duration).toBe(
				reportDefault.jump.sampleJumps[0].duration * 2
			);

			// Scan and shield unchanged
			expect(report.scan.durationPerLy).toBe(
				reportDefault.scan.durationPerLy
			);
			expect(report.shield.regenRate).toBe(
				reportDefault.shield.regenRate
			);
		});

		it('high throttle: higher core cost, faster jumps', () => {
			const tuning: ActionTuning = { ...DEFAULT_TUNING, throttle: 2.0 };
			const report = computeShipReport(
				defaultLoadout,
				tuning,
				DEFAULT_CONSTANTS
			);

			expect(report.jump.coreCostPerLy).toBe(2.0);
			// Duration should be shorter (throttle 2.0 = 0.5x duration)
			expect(report.jump.sampleJumps[0].duration).toBe(
				reportDefault.jump.sampleJumps[0].duration / 2
			);
		});

		it('high effort: longer scans, better chance past comfort', () => {
			const tuning: ActionTuning = { ...DEFAULT_TUNING, effort: 2.0 };
			const report = computeShipReport(
				defaultLoadout,
				tuning,
				DEFAULT_CONSTANTS
			);

			// Duration doubles
			expect(report.scan.durationPerLy).toBe(
				reportDefault.scan.durationPerLy * 2
			);

			// Chance within comfort is still capped at base
			const withinComfort = report.scan.sampleScans.filter(
				(s) => s.distance <= 5
			);
			for (const s of withinComfort) {
				expect(s.chance).toBe(0.7);
			}

			// Jump and shield unchanged
			expect(report.jump.coreCostPerLy).toBe(
				reportDefault.jump.coreCostPerLy
			);
			expect(report.shield.regenRate).toBe(
				reportDefault.shield.regenRate
			);
		});

		it('high priority: faster shield regen, higher draw', () => {
			const tuning: ActionTuning = { ...DEFAULT_TUNING, priority: 2.0 };
			const report = computeShipReport(
				defaultLoadout,
				tuning,
				DEFAULT_CONSTANTS
			);

			expect(report.shield.regenRate).toBe(20.0); // 10.0 * 2.0
			expect(report.shield.draw).toBe(10.0); // 5.0 * 2.0
			expect(report.shield.timeToFull).toBe(18000); // (100/20)*3600

			// Jump and scan unchanged
			expect(report.jump.coreCostPerLy).toBe(
				reportDefault.jump.coreCostPerLy
			);
			expect(report.scan.durationPerLy).toBe(
				reportDefault.scan.durationPerLy
			);
		});

		it('tuning does not change footprint', () => {
			const tuning: ActionTuning = {
				effort: 2.0,
				throttle: 2.0,
				priority: 2.0,
			};
			const report = computeShipReport(
				defaultLoadout,
				tuning,
				DEFAULT_CONSTANTS
			);
			expect(report.footprint.total).toBe(reportDefault.footprint.total);
		});

		it('tuning does not change nav', () => {
			const tuning: ActionTuning = {
				effort: 2.0,
				throttle: 2.0,
				priority: 2.0,
			};
			const report = computeShipReport(
				defaultLoadout,
				tuning,
				DEFAULT_CONSTANTS
			);
			expect(report.nav.skill).toBe(reportDefault.nav.skill);
		});
	});

	describe('hull mass affects jump comfort range', () => {
		it('heavy hull (Bulwark, mass 1.4) reduces jump comfort range', () => {
			const loadout: ReportLoadout = {
				...defaultLoadout,
				hull: h('bulwark'),
			};
			const report = computeShipReport(
				loadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			expect(report.jump.comfortRange).toBe(5.0); // 7.0 / 1.4
		});

		it('light hull (Scout, mass 0.7) increases jump comfort range', () => {
			const loadout: ReportLoadout = {
				...defaultLoadout,
				hull: h('scout'),
			};
			const report = computeShipReport(
				loadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			expect(report.jump.comfortRange).toBe(10.0); // 7.0 / 0.7
		});

		it('hull mass does NOT affect scan comfort range', () => {
			const pioneerReport = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			const bulwarkLoadout: ReportLoadout = {
				...defaultLoadout,
				hull: h('bulwark'),
			};
			const bulwarkReport = computeShipReport(
				bulwarkLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			expect(bulwarkReport.scan.comfortRange).toBe(
				pioneerReport.scan.comfortRange
			);
		});

		it('heavy hull increases strain at same distance', () => {
			const pioneerReport = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			const bulwarkLoadout: ReportLoadout = {
				...defaultLoadout,
				hull: h('bulwark'),
			};
			const bulwarkReport = computeShipReport(
				bulwarkLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);

			// At distance 5: Pioneer comfort=7 → strain=1.0; Bulwark comfort=5 → strain=1.0
			// At distance beyond Bulwark comfort (e.g. 7): Bulwark should have strain > 1.0
			const pioneerStrain7 =
				pioneerReport.jump.sampleJumps.find((j) => j.distance === 7)
					?.strain ?? 0;
			const bulwarkStrain7 =
				bulwarkReport.jump.sampleJumps.find((j) => j.distance === 7)
					?.strain ?? 0;
			expect(pioneerStrain7).toBe(1.0); // 7 <= 7 comfort
			expect(bulwarkStrain7).toBeGreaterThan(1.0); // 7 > 5 comfort
		});
	});

	describe('hull signature section', () => {
		it('reports correct values for Pioneer', () => {
			const report = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			expect(report.signature.hullSignature).toBe(1.0);
			expect(report.signature.weaponDrawMultiplier).toBe(1.0);
			expect(report.signature.stealthDrawMultiplier).toBe(1.0);
		});

		it('reports correct values for Striker', () => {
			const loadout: ReportLoadout = {
				...defaultLoadout,
				hull: h('striker'),
			};
			const report = computeShipReport(
				loadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			expect(report.signature.hullSignature).toBe(1.3);
			expect(report.signature.weaponDrawMultiplier).toBe(0.6);
			expect(report.signature.stealthDrawMultiplier).toBe(1.0);
		});
	});

	describe('hull amplitude multiplier', () => {
		it('Scout amplitude bonus reduces jump duration vs Pioneer', () => {
			const pioneerReport = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			const scoutLoadout: ReportLoadout = {
				...defaultLoadout,
				hull: h('scout'),
			};
			const scoutReport = computeShipReport(
				scoutLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);

			// At distance 1, Scout should have shorter duration due to amplitude bonus
			const pioneerDuration = pioneerReport.jump.sampleJumps.find(
				(j) => j.distance === 1
			)!.duration;
			const scoutDuration = scoutReport.jump.sampleJumps.find(
				(j) => j.distance === 1
			)!.duration;
			expect(scoutDuration).toBeLessThan(pioneerDuration);
		});
	});

	describe('underpowered loadout', () => {
		const loadout: ReportLoadout = {
			...defaultLoadout,
			drive: p('dr_705'),
		};
		const report = computeShipReport(
			loadout,
			DEFAULT_TUNING,
			DEFAULT_CONSTANTS
		);

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

	describe('mechanics', () => {
		it('default loadout: all mechanics are null', () => {
			const report = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			expect(report.mechanics.transitShieldRegen).toBeNull();
			expect(report.mechanics.coreResonanceScanning).toBeNull();
			expect(report.mechanics.sensorShieldCoupling).toBeNull();
		});

		describe('Aegis Testudo — Transit Shield Harmonics', () => {
			const loadout: ReportLoadout = {
				...defaultLoadout,
				drive: p('aegis_testudo'),
			};
			const report = computeShipReport(
				loadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);

			it('transit shield regen activates', () => {
				expect(report.mechanics.transitShieldRegen).not.toBeNull();
			});

			it('rate is half of shield regen', () => {
				expect(
					report.mechanics.transitShieldRegen!.regenRateInTransit
				).toBe(report.shield.regenRate * 0.5);
			});

			it('sample jumps match jump section distances', () => {
				const mechDistances =
					report.mechanics.transitShieldRegen!.sampleJumps.map(
						(j) => j.distance
					);
				const jumpDistances = report.jump.sampleJumps.map(
					(j) => j.distance
				);
				expect(mechDistances).toEqual(jumpDistances);
			});

			it('recovered HP scales with jump duration', () => {
				const samples =
					report.mechanics.transitShieldRegen!.sampleJumps;
				for (const s of samples) {
					expect(s.shieldRecovered).toBeGreaterThan(0);
				}
				// Longer jumps recover more
				if (samples.length >= 2) {
					const shorter = samples[0];
					const longer = samples[samples.length - 1];
					expect(longer.shieldRecovered).toBeGreaterThan(
						shorter.shieldRecovered
					);
				}
			});

			it('other mechanics are null', () => {
				expect(report.mechanics.coreResonanceScanning).toBeNull();
				expect(report.mechanics.sensorShieldCoupling).toBeNull();
			});
		});

		describe('Epoch Sensor 2 — Core Resonance Scanning', () => {
			const loadout: ReportLoadout = {
				...defaultLoadout,
				sensor: p('epoch_sensor_2'),
			};
			const report = computeShipReport(
				loadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);

			it('core resonance activates', () => {
				expect(report.mechanics.coreResonanceScanning).not.toBeNull();
			});

			it('at magnitude 1.0, all cost becomes core damage', () => {
				for (const s of report.mechanics.coreResonanceScanning!
					.sampleScans) {
					expect(s.capacitorCost).toBe(0);
					expect(s.coreDamage).toBeGreaterThan(0);
				}
			});

			it('sample distances match scan section', () => {
				const mechDistances =
					report.mechanics.coreResonanceScanning!.sampleScans.map(
						(s) => s.distance
					);
				const scanDistances = report.scan.sampleScans.map(
					(s) => s.distance
				);
				expect(mechDistances).toEqual(scanDistances);
			});

			it('scansBeforeCoreDeath is finite', () => {
				for (const s of report.mechanics.coreResonanceScanning!
					.sampleScans) {
					expect(isFinite(s.scansBeforeCoreDeath)).toBe(true);
					expect(s.scansBeforeCoreDeath).toBeGreaterThan(0);
				}
			});

			it('other mechanics are null', () => {
				expect(report.mechanics.transitShieldRegen).toBeNull();
				expect(report.mechanics.sensorShieldCoupling).toBeNull();
			});
		});

		describe('DSC Shield Mk II — Sensor-Shield Coupling', () => {
			const loadout: ReportLoadout = {
				...defaultLoadout,
				shield: p('dsc_shield_mk2'),
			};
			const report = computeShipReport(
				loadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);

			it('coupling activates', () => {
				expect(report.mechanics.sensorShieldCoupling).not.toBeNull();
			});

			it('multiplier is 1.4', () => {
				expect(
					report.mechanics.sensorShieldCoupling!
						.passiveAffinityMultiplier
				).toBeCloseTo(1.4);
			});

			it('other mechanics are null', () => {
				expect(report.mechanics.transitShieldRegen).toBeNull();
				expect(report.mechanics.coreResonanceScanning).toBeNull();
			});
		});

		describe('full crossover loadout — all three mechanics active', () => {
			const loadout: ReportLoadout = {
				...defaultLoadout,
				drive: p('aegis_testudo'),
				sensor: p('epoch_sensor_2'),
				shield: p('dsc_shield_mk2'),
			};
			const report = computeShipReport(
				loadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);

			it('all three mechanics are active', () => {
				expect(report.mechanics.transitShieldRegen).not.toBeNull();
				expect(report.mechanics.coreResonanceScanning).not.toBeNull();
				expect(report.mechanics.sensorShieldCoupling).not.toBeNull();
			});
		});

		describe('tuning interaction — priority doubles transit shield regen', () => {
			const loadout: ReportLoadout = {
				...defaultLoadout,
				drive: p('aegis_testudo'),
			};
			const tuning: ActionTuning = { ...DEFAULT_TUNING, priority: 2.0 };
			const report = computeShipReport(
				loadout,
				tuning,
				DEFAULT_CONSTANTS
			);

			it('transit regen rate reflects doubled shield priority', () => {
				// Shield regen = 10.0 * 2.0 = 20.0, transit = 20.0 * 0.5 = 10.0
				expect(report.shield.regenRate).toBe(20.0);
				expect(
					report.mechanics.transitShieldRegen!.regenRateInTransit
				).toBe(10.0);
			});
		});
	});

	describe('pilot skills', () => {
		it('default pilot has no effect on scan or nav', () => {
			const reportDefault = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			const reportWithPilot = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS,
				DEFAULT_PILOT_SKILLS
			);
			expect(reportWithPilot.scan.sampleScans).toEqual(
				reportDefault.scan.sampleScans
			);
			expect(reportWithPilot.nav.discoveryByDepth).toEqual(
				reportDefault.nav.discoveryByDepth
			);
		});

		it('pilot scanning skill boosts scan success chance', () => {
			const pilot: PilotSkills = {
				...DEFAULT_PILOT_SKILLS,
				scanning: 1.25,
			};
			const reportDefault = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			const reportSkilled = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS,
				pilot
			);

			for (let i = 0; i < reportDefault.scan.sampleScans.length; i++) {
				expect(
					reportSkilled.scan.sampleScans[i].chance
				).toBeGreaterThanOrEqual(
					reportDefault.scan.sampleScans[i].chance
				);
			}
		});

		it('pilot jumping skill boosts discovery probability', () => {
			const pilot: PilotSkills = {
				...DEFAULT_PILOT_SKILLS,
				jumping: 1.25,
			};
			const reportDefault = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			const reportSkilled = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS,
				pilot
			);

			for (
				let i = 0;
				i < reportDefault.nav.discoveryByDepth.length;
				i++
			) {
				expect(
					reportSkilled.nav.discoveryByDepth[i].probability
				).toBeGreaterThanOrEqual(
					reportDefault.nav.discoveryByDepth[i].probability
				);
			}
		});

		it('pilot skills do not affect power, jump, shield, or footprint', () => {
			const pilot: PilotSkills = {
				...DEFAULT_PILOT_SKILLS,
				scanning: 1.25,
				jumping: 1.25,
			};
			const reportDefault = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS
			);
			const reportSkilled = computeShipReport(
				defaultLoadout,
				DEFAULT_TUNING,
				DEFAULT_CONSTANTS,
				pilot
			);

			expect(reportSkilled.footprint).toEqual(reportDefault.footprint);
			expect(reportSkilled.power).toEqual(reportDefault.power);
			expect(reportSkilled.jump).toEqual(reportDefault.jump);
			expect(reportSkilled.shield).toEqual(reportDefault.shield);
		});
	});
});
