import { computeShipReport } from '../report';
import type { ParsedFlags } from './parse';
import { hydrateLoadout, toReportLoadout, resolveTuning, resolveConstants, loadoutSlugs } from './parse';

export function report({ flags }: ParsedFlags): void {
	const loadout = hydrateLoadout(flags);
	const tuning = resolveTuning(flags);
	const constants = resolveConstants(flags);
	const shipReport = computeShipReport(toReportLoadout(loadout), tuning, constants);

	const out = {
		loadout: loadoutSlugs(loadout),
		tuning,
		report: shipReport,
	};

	console.log(JSON.stringify(out, null, 2)); // eslint-disable-line no-console
}
