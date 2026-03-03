/**
 * Detection command — wolf × target × environment matrix.
 *
 * Models Striker (ACU, active hunter) and Specter (DSC, passive listener)
 * hunting all hull types in their intended configurations. Compares active
 * and passive scanning across varied environments.
 *
 * bun run wb detection
 */

import {
	DEFAULT_DSP_CONSTANTS,
	DEFAULT_EMISSION_PROFILES,
	emissionPower,
	stellarNoise,
	noiseFloor,
	snr,
	maskedSNR,
	detectionProbability,
	cumulativeDetection,
	matchedFilterGain,
	passiveDetection,
	phaserHullDamage,
} from '@helm/formulas';
import type { SensorAffinity, EmissionType, SpectralType } from '@helm/formulas';
import {
	getSensorAffinity, getWeaponStats, getShieldStats, getCoreStats, getHullData,
	HULLS, getProduct,
} from './holodeck-setup';
import { r } from '../format';

// ── Catalog-sourced constants ─────────────────────────────────

// Sensor affinities from product catalog
const SENSOR_AFFINITIES: Record<string, SensorAffinity> = {
	acu: getSensorAffinity('acu_mk1'),
	vrs: getSensorAffinity('vrs_mk1'),
	dsc: getSensorAffinity('dsc_mk1'),
};

// Read Veil Array emission reduction from product catalog
const veilArray = getProduct('veil_array');
const VEIL_ARRAY_REDUCTION = veilArray?.mult_a ?? 0.7;

// Weapon and shield stats from catalog
const PHASER = getWeaponStats('phaser_array');
const TORPEDO = getWeaponStats('torpedo_launcher');
const AEGIS_DELTA = getShieldStats('aegis_delta');
const EPOCH_S = getCoreStats('epoch_s');

// ── Configuration (all input data as structured JSON) ───────

interface WolfConfig {
	id: string;
	label: string;
	hull: string;
	hullSignature: number;
	sensor: string;
	affinity: SensorAffinity;
	role: 'active' | 'passive' | 'both';
}

interface TargetConfig {
	id: string;
	label: string;
	hull: string;
	hullSignature: number;
	hullIntegrity: number;
	shieldCapacity: number;
	activity: string;
	emission: EmissionType;
	baseEmission: number;
	cloakFactor: number;
	effectiveEmission: number;
	spectralType: SpectralType;
	masking: number;
}

interface Environment {
	id: string;
	label: string;
	stellarClass: string;
	shipCount: number;
	beltMasking: number;
	noise: number;
}

function buildWolves(): WolfConfig[] {
	const wolf = (
		id: string, label: string, hullSlug: string,
		sensorSlug: string, affinityKey: string, role: WolfConfig['role'],
	): WolfConfig => {
		const hd = getHullData(hullSlug);
		return {
			id, label, hull: hullSlug,
			hullSignature: hd.hullSignature,
			sensor: sensorSlug,
			affinity: SENSOR_AFFINITIES[affinityKey],
			role,
		};
	};

	return [
		wolf('striker_acu', 'Striker + ACU (active hunter)', 'striker', 'acu_mk1', 'acu', 'active'),
		wolf('specter_dsc', 'Specter + DSC (passive listener)', 'specter', 'dsc_mk1', 'dsc', 'passive'),
		wolf('pioneer_vrs', 'Pioneer + VRS (generalist)', 'pioneer', 'vrs_mk1', 'vrs', 'both'),
		wolf('surveyor_dsc', 'Surveyor + DSC (science vessel)', 'surveyor', 'dsc_mk1', 'dsc', 'passive'),
	];
}

function buildTargets(): TargetConfig[] {
	const h = (slug: string) => {
		const hd = getHullData(slug);
		return {
			hullSignature: hd.hullSignature,
			hullIntegrity: hd.hullIntegrity,
			shieldMult: hd.shieldCapacityMultiplier,
		};
	};

	// effectiveEmission = baseEmission × hullSignature × cloakFactor
	// hullSignature: how "visible" the hull is (Specter 0.5, Bulwark 1.4)
	// cloakFactor: 1.0 normally, (1 - veilArray.mult_a) when Veil Array active
	const target = (
		id: string, label: string, hull: string,
		emission: EmissionType, spectralType: SpectralType,
		activity: string, masking: number, cloak: boolean = false,
	): TargetConfig => {
		const hd = h(hull);
		const base = emissionPower(emission);
		const cf = cloak ? (1 - VEIL_ARRAY_REDUCTION) : 1.0;
		return {
			id, label, hull,
			hullSignature: hd.hullSignature,
			hullIntegrity: hd.hullIntegrity,
			shieldCapacity: AEGIS_DELTA.capacity * hd.shieldMult,
			activity, emission,
			baseEmission: base,
			cloakFactor: cf,
			effectiveEmission: base * hd.hullSignature * cf,
			spectralType, masking,
		};
	};

	return [
		target('pioneer_mining_open', 'Pioneer mining (open)', 'pioneer', 'mining', 'continuous', 'mining', 0),
		target('pioneer_pnp_scan', 'Pioneer scanning (PNP)', 'pioneer', 'pnp_scan', 'pulse', 'pnp_scan', 0),
		target('scout_belt_scan', 'Scout belt scanning', 'scout', 'belt_scan', 'sweep', 'belt_scan', 0),
		target('surveyor_mining_belt', 'Surveyor mining (belt)', 'surveyor', 'mining', 'continuous', 'mining in belt', 2.0),
		target('surveyor_mining_open', 'Surveyor mining (open)', 'surveyor', 'mining', 'continuous', 'mining', 0),
		target('bulwark_transit', 'Bulwark transiting', 'bulwark', 'drive_sustain', 'continuous', 'drive_sustain', 0),
		target('bulwark_spool', 'Bulwark spooling drive', 'bulwark', 'drive_spool', 'pulse', 'drive_spool', 0),
		target('striker_combat', 'Striker weapons fire', 'striker', 'weapons_fire', 'pulse', 'combat', 0),
		target('specter_idle', 'Specter idle (cloaked)', 'specter', 'shield_regen', 'continuous', 'idle', 0, true),
		target('specter_uncloaked', 'Specter idle (uncloaked)', 'specter', 'shield_regen', 'continuous', 'idle', 0, false),
		target('scout_shield_regen', 'Scout shield regen', 'scout', 'shield_regen', 'continuous', 'shield_regen', 0),
		target('pioneer_ecm', 'Pioneer running ECM', 'pioneer', 'ecm', 'continuous', 'ecm', 0),
	];
}

function buildEnvironments(): Environment[] {
	const envDefs = [
		{ id: 'quiet', label: 'Quiet (M-class, empty)', stellarClass: 'M', shipCount: 0, beltMasking: 0 },
		{ id: 'normal', label: 'Normal (G-class, empty)', stellarClass: 'G', shipCount: 0, beltMasking: 0 },
		{ id: 'busy', label: 'Busy (G-class, 10 miners)', stellarClass: 'G', shipCount: 10, beltMasking: 0 },
		{ id: 'crowded', label: 'Crowded (G-class, 50 miners)', stellarClass: 'G', shipCount: 50, beltMasking: 0 },
		{ id: 'belt', label: 'Belt (G-class, masking 2.0)', stellarClass: 'G', shipCount: 5, beltMasking: 2.0 },
		{ id: 'bright', label: 'Bright (O-class, empty)', stellarClass: 'O', shipCount: 0, beltMasking: 0 },
		{ id: 'dense_belt', label: 'Dense belt (G-class, masking 4.0)', stellarClass: 'G', shipCount: 10, beltMasking: 4.0 },
	];

	return envDefs.map((e) => ({
		...e,
		noise: computeNoise(e),
	}));
}

// ── Helpers ─────────────────────────────────────────────────

function hours(h: number): number {
	return h * 3600;
}

function computeNoise(env: { stellarClass: string; shipCount: number }): number {
	const stellar = stellarNoise(env.stellarClass);
	const minerEmission = emissionPower('mining');
	const emissions = Array(env.shipCount).fill(minerEmission) as number[];
	return noiseFloor(stellar, emissions);
}

function computeSNR(signal: number, noise: number, masking: number): number {
	return masking > 0 ? maskedSNR(signal, noise, masking) : snr(signal, noise);
}

// ── Detection computation ───────────────────────────────────

interface DetectionResult {
	wolf: string;
	wolfId: string;
	target: string;
	targetId: string;
	environment: string;
	envId: string;
	input: {
		signalPower: number;
		noise: number;
		masking: number;
		activeAffinity: number;
		passiveAffinity: number;
		matchedFilterGain: number;
	};
	active: {
		effectiveSNR: number;
		perSweepChance: number;
		sweeps_1: number;
		sweeps_2: number;
		sweeps_4: number;
		sweeps_6: number;
		sweeps_10: number;
		sweeps_20: number;
	};
	passive: {
		confidence_30min: number;
		confidence_1hr: number;
		confidence_2hr: number;
		confidence_4hr: number;
		confidence_8hr: number;
		confidence_12hr: number;
		confidence_24hr: number;
		confidence_48hr: number;
	};
}

function computeDetection(
	wolf: WolfConfig,
	target: TargetConfig,
	env: Environment,
): DetectionResult {
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const totalMasking = Math.max(target.masking, env.beltMasking);

	// Use effectiveEmission which factors in hullSignature and cloakFactor
	const signal = target.effectiveEmission;

	// Active
	const activeSignal = signal * wolf.affinity.active;
	const activeSNR = computeSNR(activeSignal, env.noise, totalMasking);
	const gain = matchedFilterGain(wolf.affinity, target.spectralType);
	const effectiveSNR = activeSNR * gain;
	const perSweep = detectionProbability(effectiveSNR, DEFAULT_DSP_CONSTANTS.activeThreshold);

	// Passive — also uses effectiveEmission
	const passiveGain = matchedFilterGain(wolf.affinity, target.spectralType);
	const pd = (h: number) => r(passiveDetection(
		signal, env.noise, wolf.affinity.passive,
		hours(h), samplePeriod, passiveGain, totalMasking,
	));

	return {
		wolf: wolf.label,
		wolfId: wolf.id,
		target: target.label,
		targetId: target.id,
		environment: env.label,
		envId: env.id,
		input: {
			signalPower: r(signal),
			noise: r(env.noise),
			masking: totalMasking,
			activeAffinity: wolf.affinity.active,
			passiveAffinity: wolf.affinity.passive,
			matchedFilterGain: r(gain),
		},
		active: {
			effectiveSNR: r(effectiveSNR),
			perSweepChance: r(perSweep),
			sweeps_1: r(cumulativeDetection(perSweep, 1)),
			sweeps_2: r(cumulativeDetection(perSweep, 2)),
			sweeps_4: r(cumulativeDetection(perSweep, 4)),
			sweeps_6: r(cumulativeDetection(perSweep, 6)),
			sweeps_10: r(cumulativeDetection(perSweep, 10)),
			sweeps_20: r(cumulativeDetection(perSweep, 20)),
		},
		passive: {
			confidence_30min: pd(0.5),
			confidence_1hr: pd(1),
			confidence_2hr: pd(2),
			confidence_4hr: pd(4),
			confidence_8hr: pd(8),
			confidence_12hr: pd(12),
			confidence_24hr: pd(24),
			confidence_48hr: pd(48),
		},
	};
}

// ── Summary matrix ──────────────────────────────────────────

interface SummaryRow {
	wolfId: string;
	targetId: string;
	envId: string;
	active_4sweeps: number;
	active_10sweeps: number;
	passive_4hr: number;
	passive_8hr: number;
	passive_24hr: number;
	bestActiveAt: number | null;
	bestPassiveAt: string | null;
	verdict: string;
}

function buildSummary(results: DetectionResult[]): SummaryRow[] {
	return results.map((result) => {
		const a4 = result.active.sweeps_4;
		const a10 = result.active.sweeps_10;
		const p4 = result.passive.confidence_4hr;
		const p8 = result.passive.confidence_8hr;
		const p24 = result.passive.confidence_24hr;

		// Find minimum sweeps for >70% active detection
		const sweepValues = [
			{ n: 1, p: result.active.sweeps_1 },
			{ n: 2, p: result.active.sweeps_2 },
			{ n: 4, p: result.active.sweeps_4 },
			{ n: 6, p: result.active.sweeps_6 },
			{ n: 10, p: result.active.sweeps_10 },
			{ n: 20, p: result.active.sweeps_20 },
		];
		const bestActive = sweepValues.find((s) => s.p >= 0.7);

		// Find minimum time for >70% passive detection
		const timeValues = [
			{ t: '30min', p: result.passive.confidence_30min },
			{ t: '1hr', p: result.passive.confidence_1hr },
			{ t: '2hr', p: result.passive.confidence_2hr },
			{ t: '4hr', p: result.passive.confidence_4hr },
			{ t: '8hr', p: result.passive.confidence_8hr },
			{ t: '12hr', p: result.passive.confidence_12hr },
			{ t: '24hr', p: result.passive.confidence_24hr },
			{ t: '48hr', p: result.passive.confidence_48hr },
		];
		const bestPassive = timeValues.find((s) => s.p >= 0.7);

		// Verdict
		let verdict: string;
		if (a4 >= 0.9 && p4 >= 0.7) {
			verdict = 'Easily detected (active+passive)';
		} else if (a4 >= 0.7 && p8 >= 0.7) {
			verdict = 'Active fast, passive needs hours';
		} else if (a4 >= 0.7 && p24 < 0.5) {
			verdict = 'Active only — passive ineffective';
		} else if (a10 >= 0.7 && p24 >= 0.5) {
			verdict = 'Moderate — needs effort both ways';
		} else if (a10 >= 0.5 && p24 < 0.3) {
			verdict = 'Difficult — marginal active, passive blind';
		} else if (a10 < 0.5 && p24 < 0.3) {
			verdict = 'Nearly undetectable';
		} else if (a4 >= 0.7) {
			verdict = 'Active effective, passive slow';
		} else {
			verdict = 'Challenging — long integration needed';
		}

		return {
			wolfId: result.wolfId,
			targetId: result.targetId,
			envId: result.envId,
			active_4sweeps: a4,
			active_10sweeps: a10,
			passive_4hr: p4,
			passive_8hr: p8,
			passive_24hr: p24,
			bestActiveAt: bestActive?.n ?? null,
			bestPassiveAt: bestPassive?.t ?? null,
			verdict,
		};
	});
}

// ── PVP scan analysis — the "race" mechanic ─────────────────
//
// When a wolf does a PVP scan, two things happen simultaneously:
// 1. The wolf searches for the target (expensive, focused, loud)
// 2. The target's passive sensor picks up the scan ping
//
// This creates a race: wolf finds target vs target detects wolf.
// The wolf broadcasts its position while searching. A cloaked Specter
// with DSC passive detection might detect the Striker's ping immediately,
// start targeting, and attack before the Striker even finds them.

interface PvpEncounterConfig {
	id: string;
	label: string;
	wolf: {
		hull: string;
		hullSignature: number;
		hullIntegrity: number;
		shieldCapacity: number;
		sensor: string;
		affinity: SensorAffinity;
		capacitor: number;
		weaponDrawMult: number;
	};
	target: {
		hull: string;
		hullSignature: number;
		hullIntegrity: number;
		shieldCapacity: number;
		sensor: string;
		affinity: SensorAffinity;
		activity: string;
		emission: EmissionType;
		baseEmission: number;
		cloakFactor: number;
		effectiveEmission: number;
		weaponDrawMult: number;
	};
}

interface PvpScanStep {
	scan: number;
	cumulativeConfidence: number;
	powerSpent: number;
	powerRemaining: number;
	elapsedSeconds: number;
}

interface PvpCounterStep {
	scan: number;
	elapsedSeconds: number;
	targetConfidence: number;
	tier: string;
}

interface PvpLockInfo {
	pvpGain: number;
	lockTimeSeconds: number;
}

interface CombatResolution {
	wolfWeapon: string;
	targetWeapon: string;
	wolfTimeline: {
		firesAt: number;
		killsTargetAt: number | null;
		killMethod: string;
		detail: string;
	};
	targetTimeline: {
		firesAt: number;
		torpedoesArriveAt: number;
		hitsNeeded: number;
		torpedoCount: number;
		hitChance: number;
		pKill: number;
		detail: string;
	};
	outcome: {
		whoWinsTimingRace: string;
		timingMarginSeconds: number;
		targetKillProbability: number;
		wolfSurvivalProbability: number;
		verdict: string;
	};
}

interface PvpEncounterResult {
	id: string;
	label: string;
	wolf: PvpEncounterConfig['wolf'];
	target: PvpEncounterConfig['target'];
	constants: {
		pvpScanPowerCost: number;
		pvpSweepsPerScan: number;
		pvpDetectionThreshold: number;
		pvpScanDurationSeconds: number;
		pvpEmissionBase: number;
		baseLockSeconds: number;
	};
	wolfScan: {
		effectiveSNR: number;
		perSweepChance: number;
		perScanChance: number;
		steps: PvpScanStep[];
		scansFor70: number | null;
		scansFor90: number | null;
		maxScansBeforeDry: number;
	};
	counterDetection: {
		wolfPvpEmission: number;
		wolfEffectiveEmission: number;
		targetPassiveAffinity: number;
		targetMatchedFilterGain: number;
		steps: PvpCounterStep[];
	};
	targetLock: {
		wolfLock: PvpLockInfo;
		targetLock: PvpLockInfo;
	};
	race: {
		wolfDetectsAt: number | null;
		wolfLocksAt: number | null;
		targetDetectsAt: number | null;
		targetLocksAt: number | null;
		wolfTimeline: string | null;
		targetTimeline: string | null;
		headStart: string;
		verdict: string;
	};
	combatResolution: CombatResolution | null;
}

function buildPvpEncounters(): PvpEncounterConfig[] {
	const h = (slug: string) => {
		const hd = getHullData(slug);
		return {
			hullSignature: hd.hullSignature,
			hullIntegrity: hd.hullIntegrity,
			shieldCapacity: AEGIS_DELTA.capacity * hd.shieldCapacityMultiplier,
			weaponDrawMult: hd.weaponDrawMultiplier,
		};
	};
	const cap = EPOCH_S.capacity;

	const eff = (base: number, sig: number, cloak: number) => base * sig * cloak;

	const strikerH = h('striker');
	const specterH = h('specter');
	const pioneerH = h('pioneer');
	const bulwarkH = h('bulwark');

	return [
		// Core matchup: Striker hunting cloaked Specter
		{
			id: 'striker_vs_specter_cloaked',
			label: 'Striker (ACU) vs Specter (DSC, cloaked)',
			wolf: {
				hull: 'striker', ...strikerH,
				sensor: 'acu_mk1', affinity: SENSOR_AFFINITIES.acu, capacitor: cap,
			},
			target: {
				hull: 'specter', ...specterH,
				sensor: 'dsc_mk1', affinity: SENSOR_AFFINITIES.dsc,
				activity: 'idle (cloaked)', emission: 'shield_regen',
				baseEmission: emissionPower('shield_regen'),
				cloakFactor: 1 - VEIL_ARRAY_REDUCTION,
				effectiveEmission: eff(emissionPower('shield_regen'), specterH.hullSignature, 1 - VEIL_ARRAY_REDUCTION),
			},
		},
		// Striker hunting uncloaked Specter
		{
			id: 'striker_vs_specter_uncloaked',
			label: 'Striker (ACU) vs Specter (DSC, uncloaked)',
			wolf: {
				hull: 'striker', ...strikerH,
				sensor: 'acu_mk1', affinity: SENSOR_AFFINITIES.acu, capacitor: cap,
			},
			target: {
				hull: 'specter', ...specterH,
				sensor: 'dsc_mk1', affinity: SENSOR_AFFINITIES.dsc,
				activity: 'idle', emission: 'shield_regen',
				baseEmission: emissionPower('shield_regen'),
				cloakFactor: 1.0,
				effectiveEmission: eff(emissionPower('shield_regen'), specterH.hullSignature, 1.0),
			},
		},
		// Striker hunting mining Pioneer
		{
			id: 'striker_vs_pioneer_mining',
			label: 'Striker (ACU) vs Pioneer (VRS, mining)',
			wolf: {
				hull: 'striker', ...strikerH,
				sensor: 'acu_mk1', affinity: SENSOR_AFFINITIES.acu, capacitor: cap,
			},
			target: {
				hull: 'pioneer', ...pioneerH,
				sensor: 'vrs_mk1', affinity: SENSOR_AFFINITIES.vrs,
				activity: 'mining', emission: 'mining',
				baseEmission: emissionPower('mining'),
				cloakFactor: 1.0,
				effectiveEmission: eff(emissionPower('mining'), pioneerH.hullSignature, 1.0),
			},
		},
		// Striker hunting Bulwark (hard target)
		{
			id: 'striker_vs_bulwark',
			label: 'Striker (ACU) vs Bulwark (VRS, transit)',
			wolf: {
				hull: 'striker', ...strikerH,
				sensor: 'acu_mk1', affinity: SENSOR_AFFINITIES.acu, capacitor: cap,
			},
			target: {
				hull: 'bulwark', ...bulwarkH,
				sensor: 'vrs_mk1', affinity: SENSOR_AFFINITIES.vrs,
				activity: 'transit', emission: 'drive_sustain',
				baseEmission: emissionPower('drive_sustain'),
				cloakFactor: 1.0,
				effectiveEmission: eff(emissionPower('drive_sustain'), bulwarkH.hullSignature, 1.0),
			},
		},
		// Specter ambushing Pioneer (reverse: stealth attacker)
		{
			id: 'specter_vs_pioneer_mining',
			label: 'Specter (DSC) vs Pioneer (VRS, mining)',
			wolf: {
				hull: 'specter', ...specterH,
				sensor: 'dsc_mk1', affinity: SENSOR_AFFINITIES.dsc, capacitor: cap,
			},
			target: {
				hull: 'pioneer', ...pioneerH,
				sensor: 'vrs_mk1', affinity: SENSOR_AFFINITIES.vrs,
				activity: 'mining', emission: 'mining',
				baseEmission: emissionPower('mining'),
				cloakFactor: 1.0,
				effectiveEmission: eff(emissionPower('mining'), pioneerH.hullSignature, 1.0),
			},
		},
		// Mirror match: Striker vs Striker
		{
			id: 'striker_vs_striker',
			label: 'Striker (ACU) vs Striker (ACU, combat)',
			wolf: {
				hull: 'striker', ...strikerH,
				sensor: 'acu_mk1', affinity: SENSOR_AFFINITIES.acu, capacitor: cap,
			},
			target: {
				hull: 'striker', ...strikerH,
				sensor: 'acu_mk1', affinity: SENSOR_AFFINITIES.acu,
				activity: 'combat', emission: 'weapons_fire',
				baseEmission: emissionPower('weapons_fire'),
				cloakFactor: 1.0,
				effectiveEmission: eff(emissionPower('weapons_fire'), strikerH.hullSignature, 1.0),
			},
		},
		// Pioneer (VRS) trying to PVP scan — generalist at combat scanning
		{
			id: 'pioneer_vs_specter_cloaked',
			label: 'Pioneer (VRS) vs Specter (DSC, cloaked)',
			wolf: {
				hull: 'pioneer', ...pioneerH,
				sensor: 'vrs_mk1', affinity: SENSOR_AFFINITIES.vrs, capacitor: cap,
			},
			target: {
				hull: 'specter', ...specterH,
				sensor: 'dsc_mk1', affinity: SENSOR_AFFINITIES.dsc,
				activity: 'idle (cloaked)', emission: 'shield_regen',
				baseEmission: emissionPower('shield_regen'),
				cloakFactor: 1 - VEIL_ARRAY_REDUCTION,
				effectiveEmission: eff(emissionPower('shield_regen'), specterH.hullSignature, 1 - VEIL_ARRAY_REDUCTION),
			},
		},
	];
}

function computePvpEncounter(encounter: PvpEncounterConfig, env: Environment): PvpEncounterResult {
	const C = DEFAULT_DSP_CONSTANTS;
	const pvpEmissionBase = emissionPower('pvp_scan');
	const { wolf, target } = encounter;

	// ── Wolf's PVP scan against target ──
	// PVP scan uses pvpGain instead of regular active affinity
	const targetSignal = target.effectiveEmission;
	const pvpSignal = targetSignal * wolf.affinity.pvpGain;
	const pvpSNR = computeSNR(pvpSignal, env.noise, 0);
	const perSweep = detectionProbability(pvpSNR, C.pvpDetectionThreshold);
	const perScan = cumulativeDetection(perSweep, C.pvpSweepsPerScan);

	const maxScans = Math.floor(wolf.capacitor / C.pvpScanPowerCost);
	const steps: PvpScanStep[] = [];
	let cumMiss = 1.0;
	let scansFor70: number | null = null;
	let scansFor90: number | null = null;

	for (let i = 1; i <= Math.max(maxScans, 6); i++) {
		cumMiss *= (1 - perScan);
		const conf = r(1 - cumMiss);
		const spent = i * C.pvpScanPowerCost;
		steps.push({
			scan: i,
			cumulativeConfidence: conf,
			powerSpent: spent,
			powerRemaining: Math.max(0, wolf.capacitor - spent),
			elapsedSeconds: i * C.pvpScanDurationSeconds,
		});
		if (scansFor70 === null && conf >= 0.7) { scansFor70 = i; }
		if (scansFor90 === null && conf >= 0.9) { scansFor90 = i; }
	}

	// ── Target's counter-detection of wolf's PVP scan ping ──
	// Wolf emits pvp_scan (8.0, pulse) × wolf.hullSignature during each scan
	const wolfPvpEmission = pvpEmissionBase;
	const wolfEffectiveEmission = pvpEmissionBase * wolf.hullSignature;
	const targetGain = matchedFilterGain(target.affinity, 'pulse'); // pvp_scan is pulse
	const counterSteps: PvpCounterStep[] = [];

	for (let i = 1; i <= Math.max(maxScans, 6); i++) {
		const elapsed = i * C.pvpScanDurationSeconds;
		// Target passively integrates wolf's emission over the scan duration
		const conf = r(passiveDetection(
			wolfEffectiveEmission, env.noise, target.affinity.passive,
			elapsed, C.samplePeriodSeconds, targetGain, 0,
		));

		let tier = 'none';
		if (conf >= 0.85) { tier = 'analysis'; }
		else if (conf >= 0.65) { tier = 'type'; }
		else if (conf >= 0.40) { tier = 'class'; }
		else if (conf >= 0.15) { tier = 'anomaly'; }

		counterSteps.push({ scan: i, elapsedSeconds: elapsed, targetConfidence: conf, tier });
	}

	// ── Target lock — the step between detection and firing ──
	// Lock time = baseLockSeconds / pvpGain
	// ACU (1.5) locks fast (~87s). DSC (0.4) locks slow (~325s).
	const wolfLockTime = Math.round(C.baseLockSeconds / wolf.affinity.pvpGain);
	const targetLockTime = Math.round(C.baseLockSeconds / target.affinity.pvpGain);

	// ── Race analysis (detect + lock = ready to fire) ──
	const wolfDetectsAt = scansFor70 ? steps[scansFor70 - 1].elapsedSeconds : null;
	const wolfLocksAt = wolfDetectsAt !== null ? wolfDetectsAt + wolfLockTime : null;

	const firstAnomaly = counterSteps.find((s) => s.tier !== 'none');
	const targetDetectsAt = firstAnomaly ? firstAnomaly.elapsedSeconds : null;
	const targetLocksAt = targetDetectsAt !== null ? targetDetectsAt + targetLockTime : null;

	const wolfTimeline = wolfLocksAt !== null
		? `detect at ${formatTime(wolfDetectsAt!)} + lock ${formatTime(wolfLockTime)} = fire at ${formatTime(wolfLocksAt)}`
		: null;
	const targetTimeline = targetLocksAt !== null
		? `detect at ${formatTime(targetDetectsAt!)} + lock ${formatTime(targetLockTime)} = fire at ${formatTime(targetLocksAt)}`
		: null;

	let headStart = 'N/A';
	let verdict: string;

	if (wolfLocksAt === null && targetLocksAt === null) {
		verdict = 'Neither side can lock — ghost ships in the void';
	} else if (wolfLocksAt === null) {
		verdict = 'Wolf cannot find target — PVP scan ineffective against this target';
	} else if (targetLocksAt === null) {
		verdict = `Wolf fires at ${formatTime(wolfLocksAt)} — target never detects the ping (perfect ambush)`;
	} else {
		const diff = wolfLocksAt - targetLocksAt;
		const absDiff = Math.abs(diff);

		if (absDiff <= 30) {
			headStart = `coin flip (${absDiff}s difference)`;
			verdict = `COIN FLIP — wolf fires at ${formatTime(wolfLocksAt)}, target fires at ${formatTime(targetLocksAt)}`;
		} else if (diff > 0) {
			headStart = `target fires ${formatTime(diff)} first`;
			verdict = `Target fires first at ${formatTime(targetLocksAt)}, wolf at ${formatTime(wolfLocksAt)} (${formatTime(diff)} late)`;
		} else {
			headStart = `wolf fires ${formatTime(-diff)} first`;
			verdict = `Wolf fires first at ${formatTime(wolfLocksAt)}, target at ${formatTime(targetLocksAt)} (${formatTime(-diff)} late)`;
		}

		// Power context
		if (wolfDetectsAt !== null && scansFor70 !== null) {
			const powerLeft = steps[scansFor70 - 1].powerRemaining;
			if (powerLeft <= 0) {
				verdict += ' (wolf is DRY — no power for combat)';
			} else if (powerLeft <= 25) {
				verdict += ` (wolf has ${powerLeft} power left)`;
			}
		}
	}

	// ── Combat resolution — who DIES first? ──
	// Only compute for encounters where wolf has phasers and target has torpedoes
	// (Striker vs Specter is the canonical matchup)
	const hasPhaserWolf = wolf.hull === 'striker';
	const hasTorpedoTarget = target.hull === 'specter';
	const combatResolution = (hasPhaserWolf && hasTorpedoTarget)
		? computeCombatResolution(encounter, wolfLocksAt, targetLocksAt)
		: null;

	return {
		id: encounter.id,
		label: encounter.label,
		wolf: encounter.wolf,
		target: encounter.target,
		constants: {
			pvpScanPowerCost: C.pvpScanPowerCost,
			pvpSweepsPerScan: C.pvpSweepsPerScan,
			pvpDetectionThreshold: C.pvpDetectionThreshold,
			pvpScanDurationSeconds: C.pvpScanDurationSeconds,
			pvpEmissionBase,
			baseLockSeconds: C.baseLockSeconds,
		},
		wolfScan: {
			effectiveSNR: r(pvpSNR),
			perSweepChance: r(perSweep),
			perScanChance: r(perScan),
			steps,
			scansFor70,
			scansFor90,
			maxScansBeforeDry: maxScans,
		},
		counterDetection: {
			wolfPvpEmission,
			wolfEffectiveEmission: r(wolfEffectiveEmission),
			targetPassiveAffinity: target.affinity.passive,
			targetMatchedFilterGain: r(targetGain),
			steps: counterSteps,
		},
		targetLock: {
			wolfLock: { pvpGain: wolf.affinity.pvpGain, lockTimeSeconds: wolfLockTime },
			targetLock: { pvpGain: target.affinity.pvpGain, lockTimeSeconds: targetLockTime },
		},
		race: {
			wolfDetectsAt,
			wolfLocksAt,
			targetDetectsAt,
			targetLocksAt,
			wolfTimeline,
			targetTimeline,
			headStart,
			verdict,
		},
		combatResolution,
	};
}

/**
 * Compute full combat resolution for a PVP encounter.
 *
 * Models the Striker vs Specter race:
 * - Wolf (Striker): fires phasers, drains shields then burns hull
 * - Target (Specter): fires torpedoes with flight time delay
 * - Who DIES first determines the winner
 */
function computeCombatResolution(
	encounter: PvpEncounterConfig,
	wolfFiresAt: number | null,
	targetFiresAt: number | null,
): CombatResolution | null {
	if (wolfFiresAt === null && targetFiresAt === null) {return null;}

	const C = DEFAULT_DSP_CONSTANTS;
	const { wolf, target } = encounter;

	// ── Wolf's phaser kill timeline ──
	// Wolf fires phasers: drain shields, then overflow to hull damage
	// Cloaked targets have shields DOWN — phasers go straight to hull
	const phaserDrainRate = PHASER.damage; // phaser_array mult_a
	const shieldRegenRate = AEGIS_DELTA.rate; // aegis_delta rate at priority 1.0
	const targetCloaked = target.cloakFactor < 1.0;
	const targetShieldCap = targetCloaked ? 0 : target.shieldCapacity;
	const targetHullHP = target.hullIntegrity;

	// Net shield drain (accounting for target regen)
	const netShieldDrain = phaserDrainRate - (targetCloaked ? 0 : shieldRegenRate);
	const shieldDepletionHours = targetShieldCap > 0 && netShieldDrain > 0 ? targetShieldCap / netShieldDrain : 0;
	const shieldDepletionSeconds = shieldDepletionHours * 3600;

	// Hull damage phase
	const hullDmgPerHour = phaserHullDamage(phaserDrainRate, 1.0, C.phaserHullDamageMult);
	const hullKillHours = hullDmgPerHour > 0 ? targetHullHP / hullDmgPerHour : Infinity;
	const hullKillSeconds = hullKillHours * 3600;

	// Total time from wolf firing to target death
	const wolfKillTime = shieldDepletionSeconds + hullKillSeconds;
	const wolfKillsAt = wolfFiresAt !== null ? wolfFiresAt + wolfKillTime : null;

	// ── Target's torpedo kill timeline ──
	const torpCount = TORPEDO.capacity;
	const torpAccuracy = TORPEDO.accuracy;
	const torpDamage = TORPEDO.damage;
	const torpFlightTime = C.torpedoFlightSeconds;

	// Wolf's effective HP (shields + hull)
	const wolfTotalHP = wolf.shieldCapacity + wolf.hullIntegrity;
	const hitsNeeded = Math.ceil(wolfTotalHP / torpDamage);

	// P(hitsNeeded or more hits from torpCount torpedoes at torpAccuracy)
	// Binomial: P(X >= k) = sum_{i=k}^{n} C(n,i) * p^i * (1-p)^(n-i)
	let pKill = 0;
	for (let i = hitsNeeded; i <= torpCount; i++) {
		pKill += binomial(torpCount, i) * Math.pow(torpAccuracy, i) * Math.pow(1 - torpAccuracy, torpCount - i);
	}
	pKill = Math.min(1, Math.max(0, pKill));

	const torpedoesArriveAt = targetFiresAt !== null ? targetFiresAt + torpFlightTime : Infinity;

	// ── Who dies first? ──
	let whoWinsTimingRace: string;
	let timingMarginSeconds: number;

	const wolfKillsAtSafe = wolfKillsAt ?? Infinity;
	const torpedoesArriveAtSafe = torpedoesArriveAt;

	if (wolfKillsAtSafe < torpedoesArriveAtSafe) {
		whoWinsTimingRace = 'wolf';
		timingMarginSeconds = Math.round(torpedoesArriveAtSafe - wolfKillsAtSafe);
	} else if (torpedoesArriveAtSafe < wolfKillsAtSafe) {
		whoWinsTimingRace = 'target';
		timingMarginSeconds = Math.round(wolfKillsAtSafe - torpedoesArriveAtSafe);
	} else {
		whoWinsTimingRace = 'simultaneous';
		timingMarginSeconds = 0;
	}

	// Wolf survival probability factors in both timing and torpedo accuracy
	const wolfSurvival = whoWinsTimingRace === 'wolf' ? 1.0 : (1 - pKill);

	let verdict: string;
	if (wolfFiresAt === null) {
		verdict = 'Wolf never fires — target wins by default';
	} else if (targetFiresAt === null) {
		verdict = `Wolf kills target at ${formatTime(Math.round(wolfKillsAtSafe))} — target never fires`;
	} else if (whoWinsTimingRace === 'wolf') {
		verdict = `Wolf kills target at ${formatTime(Math.round(wolfKillsAtSafe))} before torpedoes arrive at ${formatTime(Math.round(torpedoesArriveAtSafe))} (${formatTime(timingMarginSeconds)} margin)`;
	} else {
		verdict = `Torpedoes arrive at ${formatTime(Math.round(torpedoesArriveAtSafe))}, wolf kills at ${formatTime(Math.round(wolfKillsAtSafe))} (${formatTime(timingMarginSeconds)} late). `
			+ `P(torpedo kill) = ${r(pKill * 100, 1)}%. Wolf survives ${r(wolfSurvival * 100, 1)}% of the time`;
	}

	return {
		wolfWeapon: 'phaser_array',
		targetWeapon: 'torpedo_launcher',
		wolfTimeline: {
			firesAt: wolfFiresAt ?? -1,
			killsTargetAt: wolfKillsAt !== null ? Math.round(wolfKillsAt) : null,
			killMethod: `phaser shield drain (${r(shieldDepletionSeconds, 0)}s) + hull burn (${r(hullKillSeconds, 0)}s)`,
			detail: `shields ${targetShieldCap}HP at ${netShieldDrain}/hr net drain → ${r(shieldDepletionSeconds, 0)}s. `
				+ `hull ${targetHullHP}HP at ${hullDmgPerHour}/hr → ${r(hullKillSeconds, 0)}s. total: ${r(wolfKillTime, 0)}s`,
		},
		targetTimeline: {
			firesAt: targetFiresAt ?? -1,
			torpedoesArriveAt: Math.round(torpedoesArriveAtSafe),
			hitsNeeded,
			torpedoCount: torpCount,
			hitChance: torpAccuracy,
			pKill: r(pKill),
			detail: `${torpCount} torpedoes at ${torpAccuracy * 100}% accuracy. need ${hitsNeeded}+ hits (${hitsNeeded * torpDamage}+ dmg) vs ${wolfTotalHP}HP. P(kill) = ${r(pKill * 100, 1)}%`,
		},
		outcome: {
			whoWinsTimingRace,
			timingMarginSeconds,
			targetKillProbability: r(pKill),
			wolfSurvivalProbability: r(wolfSurvival),
			verdict,
		},
	};
}

function binomial(n: number, k: number): number {
	if (k < 0 || k > n) {return 0;}
	if (k === 0 || k === n) {return 1;}
	let result = 1;
	for (let i = 0; i < k; i++) {
		result *= (n - i) / (i + 1);
	}
	return result;
}

function formatTime(seconds: number): string {
	if (seconds < 60) { return `${seconds}s`; }
	const min = Math.floor(seconds / 60);
	const sec = seconds % 60;
	return sec > 0 ? `${min}m${sec}s` : `${min}m`;
}

// ── Combat outcome projections ──────────────────────────────

interface CombatProjection {
	wolfId: string;
	targetId: string;
	targetHull: string;
	targetHullIntegrity: number;
	targetShieldCapacity: number;
	phaser: {
		drainPerHour: number;
		netDrainPerHour: number;
		hoursToDeplete: number;
		canDepleteShields: boolean;
	};
	torpedo: {
		magazineSize: number;
		hitChance: number;
		damagePerHit: number;
		expectedHits: number;
		expectedTotalDamage: number;
		expectedShieldDamage: number;
		expectedHullDamage: number;
		canKill: boolean;
	};
}

function combatProjections(): CombatProjection[] {
	const wolves = [
		{ id: 'striker_acu', hull: 'striker', weaponDrawMult: 0.6 },
		{ id: 'specter_dsc', hull: 'specter', weaponDrawMult: 1.0 },
	];

	const targets = buildTargets().filter((t, i, arr) =>
		arr.findIndex((x) => x.hull === t.hull) === i,
	); // unique hulls

	const phaserDrainRate = PHASER.damage;
	const shieldRegenPerHour = AEGIS_DELTA.rate;
	const torpMagazine = TORPEDO.capacity;
	const torpAccuracy = TORPEDO.accuracy;
	const torpDamage = TORPEDO.damage;

	const results: CombatProjection[] = [];

	for (const wolf of wolves) {
		for (const target of targets) {
			const drain = phaserDrainRate;
			const netDrain = drain - shieldRegenPerHour;
			const hoursToDeplete = netDrain > 0 ? target.shieldCapacity / netDrain : Infinity;

			const expectedHits = torpMagazine * torpAccuracy;
			const expectedTotal = expectedHits * torpDamage;
			const expectedShieldDmg = Math.min(expectedTotal, target.shieldCapacity);
			const expectedHullDmg = Math.max(0, expectedTotal - target.shieldCapacity);

			results.push({
				wolfId: wolf.id,
				targetId: target.id,
				targetHull: target.hull,
				targetHullIntegrity: target.hullIntegrity,
				targetShieldCapacity: target.shieldCapacity,
				phaser: {
					drainPerHour: drain,
					netDrainPerHour: netDrain,
					hoursToDeplete: r(hoursToDeplete, 1),
					canDepleteShields: netDrain > 0,
				},
				torpedo: {
					magazineSize: torpMagazine,
					hitChance: torpAccuracy,
					damagePerHit: torpDamage,
					expectedHits: r(expectedHits, 1),
					expectedTotalDamage: r(expectedTotal, 1),
					expectedShieldDamage: r(expectedShieldDmg, 1),
					expectedHullDamage: r(expectedHullDmg, 1),
					canKill: expectedHullDmg >= target.hullIntegrity,
				},
			});
		}
	}

	return results;
}

// ── Main ─────────────────────────────────────────────────────

export type { DetectionResult, SummaryRow, PvpEncounterResult, CombatProjection };

export interface DetectionOutput {
	generated: string;
	config: unknown;
	wolves: WolfConfig[];
	targets: TargetConfig[];
	environments: Environment[];
	detectionMatrix: DetectionResult[];
	summary: SummaryRow[];
	pvpScanEncounters: PvpEncounterResult[];
	combatProjections: CombatProjection[];
	stats: {
		totalCombinations: number;
		wolvesCount: number;
		targetsCount: number;
		environmentsCount: number;
		verdictCounts: Record<string, number>;
		pvpEncounterCount: number;
		pvpVerdicts: Record<string, number>;
	};
}

export function runDetection(): DetectionOutput {
	const wolves = buildWolves();
	const targets = buildTargets();
	const environments = buildEnvironments();

	// Compute full detection matrix (PNP active + passive)
	const fullResults: DetectionResult[] = [];
	for (const wolf of wolves) {
		for (const target of targets) {
			for (const env of environments) {
				fullResults.push(computeDetection(wolf, target, env));
			}
		}
	}

	const summary = buildSummary(fullResults);
	const combat = combatProjections();

	// Compute PVP scan encounters (the "race" mechanic)
	const pvpEncounters = buildPvpEncounters();
	const defaultEnv = environments.find((e) => e.id === 'normal')!;
	const pvpResults = pvpEncounters.map((enc) => computePvpEncounter(enc, defaultEnv));

	return {
		generated: new Date().toISOString(),
		config: {
			constants: {
				activeThreshold: DEFAULT_DSP_CONSTANTS.activeThreshold,
				passiveThreshold: DEFAULT_DSP_CONSTANTS.detectionThreshold,
				passiveConfidenceCap: DEFAULT_DSP_CONSTANTS.passiveConfidenceCap,
				samplePeriodSeconds: DEFAULT_DSP_CONSTANTS.samplePeriodSeconds,
				detectionSteepness: DEFAULT_DSP_CONSTANTS.detectionSteepness,
				pvpScanPowerCost: DEFAULT_DSP_CONSTANTS.pvpScanPowerCost,
				pvpSweepsPerScan: DEFAULT_DSP_CONSTANTS.pvpSweepsPerScan,
				pvpDetectionThreshold: DEFAULT_DSP_CONSTANTS.pvpDetectionThreshold,
				pvpScanDurationSeconds: DEFAULT_DSP_CONSTANTS.pvpScanDurationSeconds,
			},
			emissionLevels: Object.fromEntries(
				Object.entries(DEFAULT_EMISSION_PROFILES).map(([k, v]) => [k, { base: v.base, spectralType: v.spectralType }]),
			),
			sensorAffinities: SENSOR_AFFINITIES,
			hulls: HULLS.map((h) => ({
				slug: h.slug,
				hullSignature: h.hullSignature,
				hullIntegrity: h.hullIntegrity,
				shieldCapacityMultiplier: h.shieldCapacityMultiplier ?? 1.0,
				weaponDrawMultiplier: h.weaponDrawMultiplier ?? 1.0,
				stealthDrawMultiplier: h.stealthDrawMultiplier ?? 1.0,
			})),
		},
		wolves,
		targets,
		environments,
		detectionMatrix: fullResults,
		summary,
		pvpScanEncounters: pvpResults,
		combatProjections: combat,
		stats: {
			totalCombinations: fullResults.length,
			wolvesCount: wolves.length,
			targetsCount: targets.length,
			environmentsCount: environments.length,
			verdictCounts: countBy(summary, (s) => s.verdict),
			pvpEncounterCount: pvpResults.length,
			pvpVerdicts: countBy(pvpResults, (e) => e.race.verdict),
		},
	};
}

export function detection(): void {
	console.log(JSON.stringify(runDetection(), null, 2)); // eslint-disable-line no-console
}

function countBy<T>(arr: T[], fn: (item: T) => string): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const item of arr) {
		const key = fn(item);
		counts[key] = (counts[key] ?? 0) + 1;
	}
	return counts;
}
