import { computeShipReport } from '../report';
import { getProductsByType, getProduct, DEFAULT_LOADOUT_SLUGS } from '../data/products';
import { HULLS } from '../data/hulls';
import type { ActionTuning, ComponentType, Constants, ShipReport, ReportLoadout, Hull, CatalogProduct } from '../types';
import { DEFAULT_CONSTANTS, DEFAULT_TUNING } from '../types';

interface Scenario {
	name: string;
	description: string;
	input: {
		loadout: Record<string, string>;
		tuning: ActionTuning;
	};
	output: ShipReport;
}

interface AnalysisCategory {
	category: string;
	description: string;
	scenarios: Scenario[];
}

interface Analysis {
	generated: string;
	defaults: {
		loadout: Record<string, string>;
		tuning: ActionTuning;
		constants: Constants;
	};
	categories: AnalysisCategory[];
}

const defaultSlugs = {
	hull: 'pioneer',
	core: DEFAULT_LOADOUT_SLUGS.core,
	drive: DEFAULT_LOADOUT_SLUGS.drive,
	sensor: DEFAULT_LOADOUT_SLUGS.sensor,
	shield: DEFAULT_LOADOUT_SLUGS.shield,
	nav: DEFAULT_LOADOUT_SLUGS.nav,
};

function resolveHull(slug: string): Hull {
	return HULLS.find((h) => h.slug === slug) ?? HULLS[0];
}

function resolveProduct(type: ComponentType, spec: string): CatalogProduct {
	const p = getProduct(spec);
	if (p) {return p;}
	const fallback = getProduct(defaultSlugs[type as keyof typeof defaultSlugs]);
	if (!fallback) {throw new Error(`No product found for ${type}: ${spec}`);}
	return fallback;
}

function buildLoadout(overrides: Partial<Record<string, string>> = {}): ReportLoadout {
	const slugs = { ...defaultSlugs, ...overrides };
	return {
		hull: resolveHull(slugs.hull),
		core: resolveProduct('core', slugs.core),
		drive: resolveProduct('drive', slugs.drive),
		sensor: resolveProduct('sensor', slugs.sensor),
		shield: resolveProduct('shield', slugs.shield),
		nav: resolveProduct('nav', slugs.nav),
	};
}

function slugsOf(loadout: ReportLoadout): Record<string, string> {
	return {
		hull: loadout.hull.slug,
		core: loadout.core.slug,
		drive: loadout.drive.slug,
		sensor: loadout.sensor.slug,
		shield: loadout.shield.slug,
		nav: loadout.nav.slug,
	};
}

function run(
	loadoutOverrides: Partial<Record<string, string>>,
	tuning: ActionTuning = DEFAULT_TUNING,
	constants: Constants = DEFAULT_CONSTANTS,
): { slugs: Record<string, string>; report: ShipReport } {
	const loadout = buildLoadout(loadoutOverrides);
	return {
		slugs: slugsOf(loadout),
		report: computeShipReport(loadout, tuning, constants),
	};
}

function scenario(
	name: string,
	description: string,
	loadoutOverrides: Partial<Record<string, string>>,
	tuning: ActionTuning = DEFAULT_TUNING,
): Scenario {
	const { slugs, report } = run(loadoutOverrides, tuning);
	return {
		name,
		description,
		input: { loadout: slugs, tuning },
		output: report,
	};
}

// ── Category builders ──────────────────────────────────────

function baseline(): AnalysisCategory {
	return {
		category: 'Baseline',
		description: 'Default loadout at default tuning — the reference ship.',
		scenarios: [
			scenario(
				'Reference ship',
				'Pioneer hull, Epoch-S, DR-505, VRS Mk I, Aegis Delta, Nav Tier 3. All tuning at 1.0.',
				{},
			),
		],
	};
}

function throttleSweep(): AnalysisCategory {
	const values = [0.5, 1.0, 1.5, 2.0];
	return {
		category: 'Throttle Sweep',
		description: 'Jump metrics at varying throttle levels. Default loadout.',
		scenarios: values.map((t) =>
			scenario(
				`throttle=${t}`,
				`Default loadout at throttle ${t}. ${t <= 0.5 ? 'Limp-home: zero core cost.' : ''}`,
				{},
				{ ...DEFAULT_TUNING, throttle: t },
			),
		),
	};
}

function effortSweep(): AnalysisCategory {
	const values = [0.5, 1.0, 1.5, 2.0];
	return {
		category: 'Effort Sweep',
		description: 'Scan metrics at varying effort levels. Default loadout.',
		scenarios: values.map((e) =>
			scenario(
				`effort=${e}`,
				`Default loadout at effort ${e}. Duration scales linearly, chance capped at base.`,
				{},
				{ ...DEFAULT_TUNING, effort: e },
			),
		),
	};
}

function prioritySweep(): AnalysisCategory {
	const values = [0.5, 1.0, 1.5, 2.0];
	return {
		category: 'Priority Sweep',
		description: 'Shield metrics at varying priority levels. Default loadout.',
		scenarios: values.map((p) =>
			scenario(
				`priority=${p}`,
				`Default loadout at priority ${p}. Regen and draw scale linearly.`,
				{},
				{ ...DEFAULT_TUNING, priority: p },
			),
		),
	};
}

function powerBudget(): AnalysisCategory {
	// Run the default report to extract values for constraint checks
	const { report } = run({});
	const cap = report.power.capacitor;
	const comfortDist = Math.floor(report.jump.comfortRange);
	const comfortJump = report.jump.sampleJumps.find((s) => s.distance === comfortDist);
	const scanComfortDist = Math.floor(report.scan.comfortRange);
	const comfortScan = report.scan.sampleScans.find((s) => s.distance === scanComfortDist);

	const jumpPower = comfortJump?.powerCost ?? 0;
	const scanPower = comfortScan?.cost ?? 0;

	return {
		category: 'Power Budget Validation',
		description: `Ship-physics Section 4 constraints. Capacitor=${cap}. Comfort jump=${comfortDist}ly (${jumpPower} power), comfort scan=${scanComfortDist}ly (${scanPower} power).`,
		scenarios: [
			scenario(
				'Comfort-range jump power cost',
				`Jump ${comfortDist}ly costs ${jumpPower} power = ${Math.round((jumpPower / cap) * 100)}% of capacitor. Target: 50-70%.`,
				{},
			),
			scenario(
				'Comfort-range scan power cost',
				`Scan ${scanComfortDist}ly costs ${scanPower} power = ${Math.round((scanPower / cap) * 100)}% of capacitor. Target: should not deplete.`,
				{},
			),
			scenario(
				'Jump + scan back-to-back',
				`Combined ${jumpPower + scanPower} power = ${Math.round(((jumpPower + scanPower) / cap) * 100)}% of capacitor. Target: should exceed capacity.`,
				{},
			),
			scenario(
				'Shield draw vs regen',
				`Shield draw=${report.shield.draw}, core regen=${report.power.regenRate}/hr. Regen should outpace draw when idle.`,
				{},
			),
		],
	};
}

function coreDriveMatrix(): AnalysisCategory {
	const cores = getProductsByType('core');
	const drives = getProductsByType('drive');
	const scenarios: Scenario[] = [];
	for (const core of cores) {
		for (const drive of drives) {
			scenarios.push(
				scenario(
					`${core.slug} + ${drive.slug}`,
					`Core output=${core.mult_a}, drive consumption=${drive.mult_b}. perfRatio=min(1, ${core.mult_a}/${drive.mult_b}).`,
					{ core: core.slug, drive: drive.slug },
				),
			);
		}
	}
	return {
		category: 'Core x Drive Matrix',
		description: `All core × drive combinations (${cores.length} × ${drives.length} = ${cores.length * drives.length} scenarios). Default sensor/shield/nav, pioneer hull.`,
		scenarios,
	};
}

function sensorMatrix(): AnalysisCategory {
	const sensors = getProductsByType('sensor');
	return {
		category: 'Sensor Matrix',
		description: `All sensors (${sensors.length} scenarios). Shows comfort range, chance, duration differentiation.`,
		scenarios: sensors.map((s) =>
			scenario(
				s.slug,
				`${s.label}: sustain=${s.sustain}, chance=${s.chance}, durationMult=${s.mult_a}.`,
				{ sensor: s.slug },
			),
		),
	};
}

function shieldPriorityMatrix(): AnalysisCategory {
	const shields = getProductsByType('shield');
	const priorities = [0.5, 1.0, 2.0];
	const scenarios: Scenario[] = [];
	for (const shield of shields) {
		for (const p of priorities) {
			scenarios.push(
				scenario(
					`${shield.slug} @ priority=${p}`,
					`${shield.label}: rate=${shield.rate}, capacity=${shield.capacity}, draw=${shield.draw}.`,
					{ shield: shield.slug },
					{ ...DEFAULT_TUNING, priority: p },
				),
			);
		}
	}
	return {
		category: 'Shield x Priority Matrix',
		description: `All shields × priority (${shields.length} × ${priorities.length} = ${shields.length * priorities.length} scenarios).`,
		scenarios,
	};
}

function coreLifecycle(): AnalysisCategory {
	const cores = getProductsByType('core');
	const drives = getProductsByType('drive');
	const scenarios: Scenario[] = [];

	// Throttle 1.0: finite jumps
	for (const core of cores) {
		for (const drive of drives) {
			const { report } = run(
				{ core: core.slug, drive: drive.slug },
				{ ...DEFAULT_TUNING, throttle: 1.0 },
			);
			const jump5 = report.jump.sampleJumps.find((s) => s.distance === 5);
			const coreCost = jump5?.coreCost ?? 0;
			const jumps = coreCost > 0 ? Math.floor(report.power.coreLife / coreCost) : Infinity;

			scenarios.push(
				scenario(
					`${core.slug} + ${drive.slug} @ throttle=1.0`,
					`5ly jumps before core death: ${jumps === Infinity ? 'infinite' : jumps}. Core life=${report.power.coreLife}, cost/jump=${coreCost.toFixed(2)}.`,
					{ core: core.slug, drive: drive.slug },
					{ ...DEFAULT_TUNING, throttle: 1.0 },
				),
			);
		}
	}

	// Throttle 0.5: all should be zero cost
	for (const core of cores) {
		for (const drive of drives) {
			scenarios.push(
				scenario(
					`${core.slug} + ${drive.slug} @ throttle=0.5 (limp home)`,
					'Throttle ≤ 0.5 should produce zero core cost (limp-home mode).',
					{ core: core.slug, drive: drive.slug },
					{ ...DEFAULT_TUNING, throttle: 0.5 },
				),
			);
		}
	}

	return {
		category: 'Core Lifecycle',
		description: `How many 5ly jumps before core death at throttle 1.0, and verification of zero cost at throttle 0.5. ${cores.length} × ${drives.length} × 2 = ${cores.length * drives.length * 2} scenarios.`,
		scenarios,
	};
}

function edgeCases(): AnalysisCategory {
	return {
		category: 'Edge Cases',
		description: 'Extreme combinations and boundary conditions.',
		scenarios: [
			scenario(
				'DR-705 + Epoch-E (worst perfRatio)',
				'perfRatio = min(1.0, 0.9/1.5) = 0.6. Lowest efficiency combo — verify usable numbers.',
				{ core: 'epoch_e', drive: 'dr_705' },
			),
			scenario(
				'Aegis Eta @ priority=2.0 (highest draw)',
				'draw=16 at priority 2.0. Check draw vs capacitor headroom.',
				{ shield: 'aegis_eta' },
				{ ...DEFAULT_TUNING, priority: 2.0 },
			),
			scenario(
				'Aegis Eta @ priority=3.0 (max specialization)',
				'Rapid Recovery specialization max. draw=24 at priority 3.0.',
				{ shield: 'aegis_eta' },
				{ ...DEFAULT_TUNING, priority: 3.0 },
			),
			scenario(
				'Scout hull (lightest)',
				'Small hull, mass 0.7. Tighter internal space — check if constraints still hold.',
				{ hull: 'scout' },
			),
			scenario(
				'Bulwark hull (heaviest)',
				'Mass 1.4, largest internal space. Check power budget ratios.',
				{ hull: 'bulwark' },
			),
			scenario(
				'All economy (Epoch-E + DR-305 + ACU Mk I + Aegis Alpha)',
				'Cheapest, most efficient components. Maximum range, minimum performance.',
				{ core: 'epoch_e', drive: 'dr_305', sensor: 'acu_mk1', shield: 'aegis_alpha' },
			),
			scenario(
				'All performance (Epoch-R + DR-705 + DSC Mk I + Aegis Eta)',
				'Highest performance components. Maximum speed, minimum efficiency.',
				{ core: 'epoch_r', drive: 'dr_705', sensor: 'dsc_mk1', shield: 'aegis_eta' },
			),
			scenario(
				'Epoch-R + Aegis Testudo (worst crossover perfRatio)',
				'Rapid core (highest output) with crossover drive. Worst perfRatio among crossover combos.',
				{ core: 'epoch_r', drive: 'aegis_testudo' },
			),
			scenario(
				'DSC Shield @ priority=1.5 (crossover max priority)',
				'Sensor-coupled shield at elevated priority. Crossover draw scaling.',
				{ shield: 'dsc_shield_mk2' },
				{ ...DEFAULT_TUNING, priority: 1.5 },
			),
			scenario(
				'Scout hull + full crossover loadout',
				'Tightest internal space with all three crossover products. Footprint pressure test.',
				{ hull: 'scout', drive: 'aegis_testudo', sensor: 'epoch_sensor_2', shield: 'dsc_shield_mk2' },
			),
		],
	};
}

function tuningIsolation(): AnalysisCategory {
	return {
		category: 'Tuning Isolation',
		description: 'Verify each tuning param only affects its own system. Compare against baseline.',
		scenarios: [
			scenario(
				'Baseline (all 1.0)',
				'Reference point for isolation checks.',
				{},
				{ throttle: 1.0, effort: 1.0, priority: 1.0 },
			),
			scenario(
				'Throttle only (2.0)',
				'Only throttle changed. Scan and shield should be identical to baseline.',
				{},
				{ throttle: 2.0, effort: 1.0, priority: 1.0 },
			),
			scenario(
				'Effort only (2.0)',
				'Only effort changed. Jump and shield should be identical to baseline.',
				{},
				{ throttle: 1.0, effort: 2.0, priority: 1.0 },
			),
			scenario(
				'Priority only (2.0)',
				'Only priority changed. Jump and scan should be identical to baseline.',
				{},
				{ throttle: 1.0, effort: 1.0, priority: 2.0 },
			),
		],
	};
}

function hullSpecializations(): AnalysisCategory {
	const scenarios: Scenario[] = [];

	// Mass effect on jump comfort
	for (const hull of HULLS) {
		const { report } = run({ hull: hull.slug });
		scenarios.push(
			scenario(
				`${hull.slug} mass effect`,
				`${hull.label}: hullMass=${hull.hullMass}. Jump comfort=${report.jump.comfortRange.toFixed(1)} (raw 7.0 / ${hull.hullMass}).`,
				{ hull: hull.slug },
			),
		);
	}

	// Signature comparison
	for (const hull of HULLS) {
		const { report } = run({ hull: hull.slug });
		const sig = report.signature;
		scenarios.push(
			scenario(
				`${hull.slug} signature`,
				`${hull.label}: hullSignature=${sig.hullSignature}, weaponDraw=${sig.weaponDrawMultiplier}, stealthDraw=${sig.stealthDrawMultiplier}.`,
				{ hull: hull.slug },
			),
		);
	}

	// Scout amplitude bonus
	const scout = HULLS.find((h) => h.slug === 'scout');
	if (scout) {
		const { report: pioneerReport } = run({ hull: 'pioneer' });
		const { report: scoutReport } = run({ hull: 'scout' });
		const pDuration = pioneerReport.jump.sampleJumps.find((j) => j.distance === 5)?.duration ?? 0;
		const sDuration = scoutReport.jump.sampleJumps.find((j) => j.distance === 5)?.duration ?? 0;
		scenarios.push(
			scenario(
				'Scout amplitude bonus',
				`Scout amplitudeMultiplier=${scout.amplitudeMultiplier}. 5ly jump: Pioneer=${pDuration}s, Scout=${sDuration}s (${Math.round((1 - sDuration / pDuration) * 100)}% faster).`,
				{ hull: 'scout' },
			),
		);
	}

	return {
		category: 'Hull Specializations',
		description: `Hull mass, signature, and amplitude effects across all ${HULLS.length} hulls.`,
		scenarios,
	};
}

function hullComparison(): AnalysisCategory {
	return {
		category: 'Hull Comparison',
		description: 'All 4 hulls with default loadout. Shows how hull choice affects power budget and cargo.',
		scenarios: HULLS.map((hull) =>
			scenario(
				hull.slug,
				`${hull.label}: space=${hull.internalSpace}, mass=${hull.hullMass}, sig=${hull.hullSignature}.`,
				{ hull: hull.slug },
			),
		),
	};
}

function crossoverProducts(): AnalysisCategory {
	const scenarios: Scenario[] = [];

	// Each crossover solo
	const crossovers: { type: ComponentType; slug: string }[] = [
		{ type: 'drive', slug: 'aegis_testudo' },
		{ type: 'sensor', slug: 'epoch_sensor_2' },
		{ type: 'shield', slug: 'dsc_shield_mk2' },
	];

	for (const { type, slug } of crossovers) {
		const p = getProduct(slug)!;
		scenarios.push(
			scenario(
				`${slug} (solo)`,
				`${p.label} in default loadout. Crossover baseline.`,
				{ [type]: slug },
			),
		);
	}

	// Crossover vs native pairs
	const pairs: { type: ComponentType; crossover: string; native: string }[] = [
		{ type: 'drive', crossover: 'aegis_testudo', native: 'dr_307' },
		{ type: 'sensor', crossover: 'epoch_sensor_2', native: 'acu_mk2' },
		{ type: 'shield', crossover: 'dsc_shield_mk2', native: 'aegis_beta' },
	];

	for (const { type, native } of pairs) {
		const p = getProduct(native)!;
		scenarios.push(
			scenario(
				`${native} (native comparison)`,
				`${p.label}. Native Mk II counterpart for crossover comparison.`,
				{ [type]: native },
			),
		);
	}

	// Synergy builds
	scenarios.push(
		scenario(
			'Epoch-E + Aegis Testudo (endurance + shield-regen)',
			'Endurance core with shield-regen drive. Maximum sustained shield uptime.',
			{ core: 'epoch_e', drive: 'aegis_testudo' },
		),
		scenario(
			'Epoch-R + Aegis Testudo (rapid + shield-regen)',
			'Rapid core with shield-regen drive. Worst crossover perfRatio — high consumption, low output.',
			{ core: 'epoch_r', drive: 'aegis_testudo' },
		),
		scenario(
			'Epoch-E + Epoch Sensor 2 (endurance + core-resonance)',
			'Endurance core with core-resonance scanner. Maximum scan endurance.',
			{ core: 'epoch_e', sensor: 'epoch_sensor_2' },
		),
		scenario(
			'DSC Mk II + DSC Shield (sensor + sensor-coupled shield)',
			'DSC sensor with sensor-coupled shield. Maximum passive range synergy.',
			{ sensor: 'dsc_mk2', shield: 'dsc_shield_mk2' },
		),
	);

	// Full crossover loadout
	scenarios.push(
		scenario(
			'Full crossover loadout',
			'All three crossovers equipped simultaneously. Aegis Testudo + Epoch Sensor 2 + DSC Shield.',
			{ drive: 'aegis_testudo', sensor: 'epoch_sensor_2', shield: 'dsc_shield_mk2' },
		),
	);

	return {
		category: 'Crossover Products',
		description: `Crossover products in isolation, comparison, and synergy builds (${scenarios.length} scenarios).`,
		scenarios,
	};
}

// ── Main ───────────────────────────────────────────────────

export function analyse(): void {
	const analysis: Analysis = {
		generated: new Date().toISOString(),
		defaults: {
			loadout: defaultSlugs,
			tuning: DEFAULT_TUNING,
			constants: DEFAULT_CONSTANTS,
		},
		categories: [
			baseline(),
			tuningIsolation(),
			throttleSweep(),
			effortSweep(),
			prioritySweep(),
			powerBudget(),
			coreDriveMatrix(),
			sensorMatrix(),
			shieldPriorityMatrix(),
			coreLifecycle(),
			hullComparison(),
			hullSpecializations(),
			crossoverProducts(),
			edgeCases(),
		],
	};

	console.log(JSON.stringify(analysis, null, 2)); // eslint-disable-line no-console
}
