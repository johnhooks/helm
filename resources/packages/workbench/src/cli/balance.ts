/**
 * Balance command — all hulls × default loadout matrix.
 *
 * bun run wb balance
 * bun run wb balance --vary=core,drive    # hull × core × drive matrix
 */

import { computeShipReport } from '../report';
import type { ParsedFlags } from './parse';
import { resolveTuning, resolveConstants, COMPONENT_TYPES } from './parse';
import { getProductsByType, defaults } from '../data/products';
import { HULLS } from '../data/hulls';
import type { ComponentType, Loadout, ShipReport, Hull, WorkbenchProduct } from '../types';
import { r } from '../format';

interface BalanceRow {
	hull: string;
	core?: string;
	drive?: string;
	hullIntegrity: number;
	capacitor: number;
	coreLife: number;
	regenRate: number;
	perfRatio: number;
	jumpComfort: number;
	scanComfort: number;
	shieldCapacity: number;
	shieldRegen: number;
	cargo: number;
	equipmentSlots: number;
}

function buildLoadout(hull: Hull, overrides: Partial<Record<ComponentType, WorkbenchProduct>> = {}): Loadout {
	return {
		hull,
		core: overrides.core ?? defaults.core,
		drive: overrides.drive ?? defaults.drive,
		sensor: overrides.sensor ?? defaults.sensor,
		shield: overrides.shield ?? defaults.shield,
		nav: overrides.nav ?? defaults.nav,
	};
}

function extractRow(hull: Hull, report: ShipReport, extras?: Record<string, string>): BalanceRow {
	return {
		hull: hull.slug,
		...extras,
		hullIntegrity: hull.hullIntegrity,
		capacitor: report.power.capacitor,
		coreLife: report.power.coreLife,
		regenRate: r(report.power.regenRate, 1),
		perfRatio: r(report.power.perfRatio, 3),
		jumpComfort: r(report.jump.comfortRange, 1),
		scanComfort: r(report.scan.comfortRange, 1),
		shieldCapacity: report.shield.capacity,
		shieldRegen: r(report.shield.regenRate, 1),
		cargo: report.footprint.cargo,
		equipmentSlots: hull.equipmentSlots,
	};
}

function stddev(values: number[]): number {
	if (values.length === 0) {return 0;}
	const mean = values.reduce((a, b) => a + b, 0) / values.length;
	const sq = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
	return Math.sqrt(sq);
}

function flagOutliers(rows: BalanceRow[]): string[] {
	const warnings: string[] = [];
	const numericKeys: (keyof BalanceRow)[] = [
		'hullIntegrity', 'capacitor', 'coreLife', 'regenRate', 'perfRatio',
		'jumpComfort', 'scanComfort', 'shieldCapacity', 'shieldRegen', 'cargo',
	];

	for (const key of numericKeys) {
		const values = rows.map((row) => row[key] as number);
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const sd = stddev(values);
		if (sd === 0) {continue;}

		for (let i = 0; i < rows.length; i++) {
			const z = Math.abs((values[i] - mean) / sd);
			if (z > 2) {
				warnings.push(`OUTLIER: ${rows[i].hull}${rows[i].core ? ` + ${rows[i].core}` : ''} — ${key}=${values[i]} (${z.toFixed(1)}σ from mean ${r(mean, 1)})`);
			}
		}
	}

	return warnings;
}

export function balance({ flags }: ParsedFlags): void {
	const tuning = resolveTuning(flags);
	const constants = resolveConstants(flags);
	const varyRaw = flags.vary;

	const rows: BalanceRow[] = [];

	if (varyRaw) {
		const varySlots = varyRaw.split(',') as ComponentType[];

		// Build combinations for varied slots
		const slotProducts: Record<string, WorkbenchProduct[]> = {};
		for (const slot of varySlots) {
			if (COMPONENT_TYPES.includes(slot)) {
				slotProducts[slot] = getProductsByType(slot);
			}
		}

		for (const hull of HULLS) {
			// Generate combos for varied slots
			const combos = cartesian(varySlots.map((s) => slotProducts[s] ?? []));
			for (const combo of combos) {
				const overrides: Partial<Record<ComponentType, WorkbenchProduct>> = {};
				const extras: Record<string, string> = {};
				varySlots.forEach((slot, i) => {
					overrides[slot] = combo[i];
					extras[slot] = combo[i].slug;
				});

				const loadout = buildLoadout(hull, overrides);
				const report = computeShipReport(loadout, tuning, constants);
				rows.push(extractRow(hull, report, extras));
			}
		}
	} else {
		// Default: just hull matrix
		for (const hull of HULLS) {
			const loadout = buildLoadout(hull);
			const report = computeShipReport(loadout, tuning, constants);
			rows.push(extractRow(hull, report));
		}
	}

	const warnings = flagOutliers(rows);

	const output = {
		generated: new Date().toISOString(),
		vary: varyRaw ?? 'hull',
		tuning,
		rows,
		outliers: warnings,
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}

function cartesian(arrays: WorkbenchProduct[][]): WorkbenchProduct[][] {
	return arrays.reduce<WorkbenchProduct[][]>(
		(acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
		[[]],
	);
}
