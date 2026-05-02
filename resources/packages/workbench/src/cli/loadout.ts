import { computeShipReport } from '../report';
import type { ParsedFlags } from './parse';
import {
	hydrateLoadout,
	toReportLoadout,
	resolveTuning,
	resolveConstants,
	loadoutSlugs,
} from './parse';

export function loadout({ flags }: ParsedFlags): void {
	const lo = hydrateLoadout(flags);
	const tuning = resolveTuning(flags);
	const constants = resolveConstants(flags);
	const shipReport = computeShipReport(
		toReportLoadout(lo),
		tuning,
		constants
	);

	const out = {
		loadout: loadoutSlugs(lo),
		tuning,
		report: shipReport,
	};

	console.log(JSON.stringify(out, null, 2)); // eslint-disable-line no-console
}
