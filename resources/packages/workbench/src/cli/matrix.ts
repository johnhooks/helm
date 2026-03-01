import { computeShipReport } from '../report';
import { getProductsByType } from '../data/products';
import { HULLS } from '../data/hulls';
import type { ParsedFlags } from './parse';
import type { ComponentType } from '../types';
import {
	hydrateLoadout,
	toReportLoadout,
	resolveTuning,
	resolveConstants,
	loadoutSlugs,
	COMPONENT_TYPES,
} from './parse';

type SlotType = 'hull' | ComponentType;

const TUNING_KEYS = new Set(['throttle', 'effort', 'priority']);

function getSlotValues(slot: SlotType): string[] {
	if (slot === 'hull') {
		return HULLS.map((h) => h.slug);
	}
	return getProductsByType(slot).map((p) => p.slug);
}

function cartesian(arrays: string[][]): string[][] {
	return arrays.reduce<string[][]>(
		(acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
		[[]],
	);
}

export function matrix({ flags }: ParsedFlags): void {
	const varyRaw = flags.vary;
	if (!varyRaw) {
		console.error('--vary is required. Example: --vary=core,drive'); // eslint-disable-line no-console
		process.exit(1);
	}

	const varySlots = varyRaw.split(',') as SlotType[];
	const validSlots: SlotType[] = ['hull', ...COMPONENT_TYPES];
	for (const slot of varySlots) {
		if (!validSlots.includes(slot)) {
			console.error(`Unknown slot "${slot}". Valid: ${validSlots.join(', ')}`); // eslint-disable-line no-console
			process.exit(1);
		}
	}

	const tuning = resolveTuning(flags);
	const constants = resolveConstants(flags);

	// Build pinned flags (everything except vary/tuning/const.*)
	const pinnedFlags: Record<string, string> = {};
	for (const [key, value] of Object.entries(flags)) {
		if (key !== 'vary' && !key.startsWith('const.') && !TUNING_KEYS.has(key)) {
			pinnedFlags[key] = value;
		}
	}

	// Generate all combinations for the varied slots
	const slotValues = varySlots.map((slot) => getSlotValues(slot));
	const combos = cartesian(slotValues);

	const results = combos.map((combo) => {
		const loadoutFlags = { ...pinnedFlags };
		varySlots.forEach((slot, i) => {
			loadoutFlags[slot] = combo[i];
		});

		const loadout = hydrateLoadout(loadoutFlags);
		const shipReport = computeShipReport(toReportLoadout(loadout), tuning, constants);

		return {
			loadout: loadoutSlugs(loadout),
			tuning,
			report: shipReport,
		};
	});

	console.log(JSON.stringify(results, null, 2)); // eslint-disable-line no-console
}
