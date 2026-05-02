/**
 * DSP Tier Analysis — explore information tier progression.
 *
 * Run: bun run src/cli.ts dsp-tiers
 *
 * Shows how detection confidence maps to information quality over time,
 * with equipment/experience bonuses applied.
 */

/* eslint-disable no-console */

import {
	DEFAULT_EMISSION_PROFILES,
	DEFAULT_DSP_CONSTANTS,
	DEFAULT_TIER_THRESHOLDS,
	emissionPower,
	stellarNoise,
	noiseFloor,
	matchedFilterGain,
	passiveDetection,
	informationTier,
	adjustedThresholds,
} from '@helm/formulas';
import type {
	InformationTier,
	SensorAffinity,
	TierThresholds,
} from '@helm/formulas';
import { getSensorAffinity } from './holodeck-setup';

// Sensor affinities sourced from catalog (not formula constants)
const SENSOR_AFFINITIES: Record<string, SensorAffinity> = {
	acu: getSensorAffinity('acu_mk1'),
	vrs: getSensorAffinity('vrs_mk1'),
	dsc: getSensorAffinity('dsc_mk1'),
};
import { pct } from '../format';

function pad(s: string, len: number): string {
	return s.padEnd(len);
}

/**
 * Short code for display: A=anomaly, C=class, T=type, S=analysis(full-spectrum)
 */
function tierCode(tier: InformationTier | null): string {
	if (!tier) {
		return '-';
	}
	const codes: Record<InformationTier, string> = {
		anomaly: 'A',
		class: 'C',
		type: 'T',
		analysis: 'S',
	};
	return codes[tier];
}

function tierLabel(tier: InformationTier | null): string {
	if (!tier) {
		return '---';
	}
	return tier;
}

function hours(h: number): number {
	return h * 3600;
}

// ── Sections ─────────────────────────────────────────────────

function printThresholds(thresholds: TierThresholds, label: string): void {
	console.log(`  ${label}:`); // eslint-disable-line no-console
	console.log(`    anomaly  >= ${pct(thresholds.anomaly)}`); // eslint-disable-line no-console
	console.log(`    class    >= ${pct(thresholds.class)}`); // eslint-disable-line no-console
	console.log(`    type     >= ${pct(thresholds.type)}`); // eslint-disable-line no-console
	console.log(`    analysis >= ${pct(thresholds.analysis)}`); // eslint-disable-line no-console
}

function tierProgression(): void {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const durations = [0.5, 1, 2, 4, 6, 8, 12, 24];

	const scenarios = [
		{ label: 'Mining (DSC)', emission: 'mining' as const, sensor: 'dsc' },
		{ label: 'Mining (VRS)', emission: 'mining' as const, sensor: 'vrs' },
		{ label: 'Mining (ACU)', emission: 'mining' as const, sensor: 'acu' },
		{
			label: 'PNP scan (VRS)',
			emission: 'pnp_scan' as const,
			sensor: 'vrs',
		},
		{
			label: 'Drive spool (DSC)',
			emission: 'drive_spool' as const,
			sensor: 'dsc',
		},
		{
			label: 'Shield regen (DSC)',
			emission: 'shield_regen' as const,
			sensor: 'dsc',
		},
	];

	// Header
	const labelWidth = 22;
	const colWidth = 12;
	let header = pad('Scenario', labelWidth);
	for (const h of durations) {
		header += pad(`${h}hr`, colWidth);
	}
	console.log(header); // eslint-disable-line no-console
	console.log('-'.repeat(header.length)); // eslint-disable-line no-console

	for (const s of scenarios) {
		const power = emissionPower(s.emission);
		const profile = DEFAULT_EMISSION_PROFILES[s.emission];
		const affinity = SENSOR_AFFINITIES[s.sensor];
		const gain = matchedFilterGain(affinity, profile.spectralType);

		let row = pad(s.label, labelWidth);
		for (const h of durations) {
			const conf = passiveDetection(
				power,
				noise,
				affinity.passive,
				hours(h),
				samplePeriod,
				gain,
				0
			);
			const tier = informationTier(conf);
			row += pad(`${pct(conf)} ${tierCode(tier)}`, colWidth);
		}
		console.log(row); // eslint-disable-line no-console
	}
}

function equipmentComparison(): void {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const dsc = SENSOR_AFFINITIES.dsc;
	const contGain = matchedFilterGain(dsc, 'continuous');
	const miningPower = emissionPower('mining');

	const configs = [
		{ label: 'Stock', equip: 0, exp: 0 },
		{ label: 'Correlator (0.05)', equip: 0.05, exp: 0 },
		{ label: 'Veteran (0.03)', equip: 0, exp: 0.03 },
		{ label: 'Both stacked', equip: 0.05, exp: 0.03 },
		{ label: 'Elite setup', equip: 0.1, exp: 0.05 },
	];

	const durations = [2, 4, 6, 8, 12];
	const labelWidth = 22;
	const eqColWidth = 18;

	let header = pad('Config', labelWidth);
	for (const h of durations) {
		header += pad(`${h}hr`, eqColWidth);
	}
	console.log(header); // eslint-disable-line no-console
	console.log('-'.repeat(header.length)); // eslint-disable-line no-console

	for (const cfg of configs) {
		const thresholds = adjustedThresholds(
			DEFAULT_TIER_THRESHOLDS,
			cfg.equip,
			cfg.exp
		);
		let row = pad(cfg.label, labelWidth);

		for (const h of durations) {
			const conf = passiveDetection(
				miningPower,
				noise,
				dsc.passive,
				hours(h),
				samplePeriod,
				contGain,
				0
			);
			const tier = informationTier(conf, thresholds);
			row += pad(`${pct(conf)} ${tierLabel(tier)}`, eqColWidth);
		}
		console.log(row); // eslint-disable-line no-console
	}
}

function pilotSkillProgression(): void {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const vrs = SENSOR_AFFINITIES.vrs;
	const contGain = matchedFilterGain(vrs, 'continuous');
	const miningPower = emissionPower('mining');

	// Pilot skill levels: rookie → experienced → veteran → elite
	const skillLevels = [
		{ label: 'Rookie (1.0)', skill: 1.0 },
		{ label: 'Trained (1.05)', skill: 1.05 },
		{ label: 'Experienced (1.10)', skill: 1.1 },
		{ label: 'Veteran (1.15)', skill: 1.15 },
		{ label: 'Elite (1.25)', skill: 1.25 },
	];

	const durations = [1, 2, 4, 6, 8, 12, 24];
	const labelWidth = 22;
	const colWidth = 12;

	let header = pad('Pilot Level', labelWidth);
	for (const h of durations) {
		header += pad(`${h}hr`, colWidth);
	}
	console.log(header); // eslint-disable-line no-console
	console.log('-'.repeat(header.length)); // eslint-disable-line no-console

	for (const level of skillLevels) {
		let row = pad(level.label, labelWidth);
		for (const h of durations) {
			const conf = passiveDetection(
				miningPower,
				noise,
				vrs.passive,
				hours(h),
				samplePeriod,
				contGain,
				0,
				level.skill
			);
			row += pad(
				`${pct(conf)} ${tierCode(informationTier(conf))}`,
				colWidth
			);
		}
		console.log(row); // eslint-disable-line no-console
	}
}

function pvpScanning(): void {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;

	// PVP scenario: trying to passively detect a ship in cooldown
	// (freshly arrived, drive winding down)
	const cooldownEmission = DEFAULT_EMISSION_PROFILES.drive_cooldown.base;
	const durations = [0.5, 1, 2, 4, 6];
	const labelWidth = 30;
	const colWidth = 12;

	const scenarios = [
		{
			label: 'VRS rookie',
			sensor: SENSOR_AFFINITIES.vrs,
			skill: 1.0,
			equip: 0,
		},
		{
			label: 'VRS + correlator',
			sensor: SENSOR_AFFINITIES.vrs,
			skill: 1.0,
			equip: 0.05,
		},
		{
			label: 'VRS veteran',
			sensor: SENSOR_AFFINITIES.vrs,
			skill: 1.15,
			equip: 0,
		},
		{
			label: 'VRS vet + correlator',
			sensor: SENSOR_AFFINITIES.vrs,
			skill: 1.15,
			equip: 0.05,
		},
		{
			label: 'DSC rookie',
			sensor: SENSOR_AFFINITIES.dsc,
			skill: 1.0,
			equip: 0,
		},
		{
			label: 'DSC veteran',
			sensor: SENSOR_AFFINITIES.dsc,
			skill: 1.15,
			equip: 0,
		},
		{
			label: 'DSC vet + correlator',
			sensor: SENSOR_AFFINITIES.dsc,
			skill: 1.15,
			equip: 0.05,
		},
		{
			label: 'DSC elite + correlator',
			sensor: SENSOR_AFFINITIES.dsc,
			skill: 1.25,
			equip: 0.05,
		},
	];

	let header = pad('Setup', labelWidth);
	for (const h of durations) {
		header += pad(`${h}hr`, colWidth);
	}
	console.log(header); // eslint-disable-line no-console
	console.log('-'.repeat(header.length)); // eslint-disable-line no-console

	for (const s of scenarios) {
		const gain = matchedFilterGain(s.sensor, 'continuous');
		const thresholds = adjustedThresholds(DEFAULT_TIER_THRESHOLDS, s.equip);
		let row = pad(s.label, labelWidth);
		for (const h of durations) {
			const conf = passiveDetection(
				cooldownEmission,
				noise,
				s.sensor.passive,
				hours(h),
				samplePeriod,
				gain,
				0,
				s.skill
			);
			const tier = informationTier(conf, thresholds);
			row += pad(`${pct(conf)} ${tierCode(tier)}`, colWidth);
		}
		console.log(row); // eslint-disable-line no-console
	}
}

// ── Main ─────────────────────────────────────────────────────

export function dspTiers(): void {
	console.log('=== INFORMATION TIER THRESHOLDS ===\n'); // eslint-disable-line no-console
	printThresholds(DEFAULT_TIER_THRESHOLDS, 'Default');
	printThresholds(
		adjustedThresholds(DEFAULT_TIER_THRESHOLDS, 0.05),
		'With correlator (0.05)'
	);
	printThresholds(
		adjustedThresholds(DEFAULT_TIER_THRESHOLDS, 0.05, 0.03),
		'With correlator + veteran (0.05 + 0.03)'
	);

	console.log('\n=== TIER PROGRESSION OVER TIME (G-class, open space) ==='); // eslint-disable-line no-console
	console.log(
		'Tier codes: A=anomaly, C=class, T=type, S=analysis(spectrum)\n'
	); // eslint-disable-line no-console
	tierProgression();

	console.log(
		'\n=== EQUIPMENT BONUS IMPACT (DSC watching miner, G-class) ===\n'
	); // eslint-disable-line no-console
	equipmentComparison();

	console.log(
		'\n=== PILOT SKILL PROGRESSION (VRS watching miner, G-class) ===\n'
	); // eslint-disable-line no-console
	pilotSkillProgression();

	console.log('\n=== PVP SCANNING — DETECT A SHIP IN COOLDOWN (G-class) ==='); // eslint-disable-line no-console
	console.log(
		'Target: drive_cooldown emission (1.5). Can you find the ship that just arrived?\n'
	); // eslint-disable-line no-console
	pvpScanning();

	console.log(
		'\n=== SELF-INTERFERENCE (DSC watching miner during cooldown) ===\n'
	); // eslint-disable-line no-console
	// Inline version (avoid top-level await)
	const baseline = stellarNoise('G');
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const dsc = SENSOR_AFFINITIES.dsc;
	const contGain = matchedFilterGain(dsc, 'continuous');
	const miningPower = emissionPower('mining');
	const baseEmission = DEFAULT_EMISSION_PROFILES.drive_cooldown.base;
	const durations = [1, 2, 4, 6, 8, 12];

	const cleanNoise = noiseFloor(baseline, []);
	const labelWidth = 22;
	const colWidth = 14;

	let header = pad('Scenario', labelWidth);
	for (const h of durations) {
		header += pad(`${h}hr`, colWidth);
	}
	console.log(header); // eslint-disable-line no-console
	console.log('-'.repeat(header.length)); // eslint-disable-line no-console

	{
		let row = pad('Clean (no cooldown)', labelWidth);
		for (const h of durations) {
			const conf = passiveDetection(
				miningPower,
				cleanNoise,
				dsc.passive,
				hours(h),
				samplePeriod,
				contGain,
				0
			);
			const tier = informationTier(conf);
			row += pad(`${pct(conf)} ${tierCode(tier)}`, colWidth);
		}
		console.log(row); // eslint-disable-line no-console
	}

	const driveData: Array<{ label: string; cooldownPeak: number }> = [
		{ label: 'DR-305 (civilian)', cooldownPeak: 0.8 * baseEmission },
		{ label: 'DR-505 (industrial)', cooldownPeak: 1.0 * baseEmission },
		{ label: 'DR-705 (military)', cooldownPeak: 1.8 * baseEmission },
	];

	for (const drive of driveData) {
		const hotNoise = noiseFloor(baseline, [drive.cooldownPeak]);
		let row = pad(drive.label, labelWidth);
		for (const h of durations) {
			const conf = passiveDetection(
				miningPower,
				hotNoise,
				dsc.passive,
				hours(h),
				samplePeriod,
				contGain,
				0
			);
			const tier = informationTier(conf);
			row += pad(`${pct(conf)} ${tierCode(tier)}`, colWidth);
		}
		console.log(row); // eslint-disable-line no-console
	}
}
