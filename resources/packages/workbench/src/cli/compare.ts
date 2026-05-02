import { computeShipReport } from '../report';
import type { ParsedFlags } from './parse';
import {
	hydrateLoadout,
	toReportLoadout,
	resolveTuning,
	resolveConstants,
	loadoutSlugs,
} from './parse';

function extractPrefixed(
	flags: Record<string, string>,
	prefix: string
): Record<string, string> {
	const out: Record<string, string> = {};
	const dot = prefix + '.';

	for (const [key, value] of Object.entries(flags)) {
		if (key.startsWith(dot)) {
			out[key.slice(dot.length)] = value;
		}
	}

	return out;
}

type Primitive = string | number | boolean | null;

function computeDelta(
	a: unknown,
	b: unknown,
	path = ''
): Record<string, { a: Primitive; b: Primitive; delta: number | null }> {
	const result: Record<
		string,
		{ a: Primitive; b: Primitive; delta: number | null }
	> = {};

	if (typeof a === 'number' && typeof b === 'number') {
		if (a !== b) {
			result[path] = { a, b, delta: b - a };
		}
		return result;
	}

	if (Array.isArray(a) && Array.isArray(b)) {
		// Skip array diffing — sample arrays may differ in length
		return result;
	}

	if (a && b && typeof a === 'object' && typeof b === 'object') {
		const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
		for (const key of keys) {
			const sub = computeDelta(
				(a as Record<string, unknown>)[key],
				(b as Record<string, unknown>)[key],
				path ? `${path}.${key}` : key
			);
			Object.assign(result, sub);
		}
		return result;
	}

	if (a !== b) {
		result[path] = {
			a: a as Primitive,
			b: b as Primitive,
			delta: null,
		};
	}

	return result;
}

const TUNING_KEYS = new Set(['throttle', 'effort', 'priority']);

export function compare({ flags }: ParsedFlags): void {
	const tuning = resolveTuning(flags);
	const constants = resolveConstants(flags);

	// Build base flags from defaults, then overlay a.* and b.*
	const aOverrides = extractPrefixed(flags, 'a');
	const bOverrides = extractPrefixed(flags, 'b');

	// Shared non-prefixed flags serve as the base for both
	const baseFlags: Record<string, string> = {};
	for (const [key, value] of Object.entries(flags)) {
		if (
			!key.startsWith('a.') &&
			!key.startsWith('b.') &&
			!key.startsWith('const.') &&
			!TUNING_KEYS.has(key)
		) {
			baseFlags[key] = value;
		}
	}

	const aFlags = { ...baseFlags, ...aOverrides };
	const bFlags = { ...baseFlags, ...bOverrides };

	const loadoutA = hydrateLoadout(aFlags);
	const loadoutB = hydrateLoadout(bFlags);

	const reportA = computeShipReport(
		toReportLoadout(loadoutA),
		tuning,
		constants
	);
	const reportB = computeShipReport(
		toReportLoadout(loadoutB),
		tuning,
		constants
	);

	const delta = computeDelta(reportA, reportB);

	const out = {
		a: {
			loadout: loadoutSlugs(loadoutA),
			report: reportA,
		},
		b: {
			loadout: loadoutSlugs(loadoutB),
			report: reportB,
		},
		tuning,
		delta,
	};

	console.log(JSON.stringify(out, null, 2)); // eslint-disable-line no-console
}
