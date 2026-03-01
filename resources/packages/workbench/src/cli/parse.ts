import type { ActionTuning, Constants } from '@helm/formulas';
import type { Loadout, CatalogProduct } from '@helm/holodeck';
import { buildLoadout, DEFAULT_LOADOUT_SLUGS } from '@helm/holodeck';
import type { ComponentType, ReportLoadout } from '../types';
import { DEFAULT_CONSTANTS, DEFAULT_TUNING } from '../types';

export const COMPONENT_TYPES: ComponentType[] = ['core', 'drive', 'sensor', 'shield', 'nav'];

export const DEFAULT_SLUGS: Record<string, string> = {
	hull: 'pioneer',
	core: DEFAULT_LOADOUT_SLUGS.core,
	drive: DEFAULT_LOADOUT_SLUGS.drive,
	sensor: DEFAULT_LOADOUT_SLUGS.sensor,
	shield: DEFAULT_LOADOUT_SLUGS.shield,
	nav: DEFAULT_LOADOUT_SLUGS.nav,
};

export interface ParsedFlags {
	flags: Record<string, string>;
	positional: string[];
}

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedFlags {
	const flags: Record<string, string> = {};
	const positional: string[] = [];

	for (const arg of argv) {
		if (arg.startsWith('--')) {
			const eq = arg.indexOf('=');
			if (eq !== -1) {
				flags[arg.slice(2, eq)] = arg.slice(eq + 1);
			} else {
				flags[arg.slice(2)] = 'true';
			}
		} else {
			positional.push(arg);
		}
	}

	return { flags, positional };
}

export function hydrateLoadout(flags: Record<string, string>): Loadout {
	const hullSlug = flags.hull ?? DEFAULT_SLUGS.hull;
	const componentSlugs: Record<string, string> = {};
	for (const type of COMPONENT_TYPES) {
		componentSlugs[type] = flags[type] ?? DEFAULT_SLUGS[type];
	}
	return buildLoadout(hullSlug, componentSlugs);
}

/**
 * Unwrap a holodeck Loadout (InstalledComponent wrappers) into a
 * flat ReportLoadout for formula analysis.
 */
export function toReportLoadout(loadout: Loadout): ReportLoadout {
	return {
		hull: loadout.hull,
		core: loadout.core.product as CatalogProduct,
		drive: loadout.drive.product as CatalogProduct,
		sensor: loadout.sensor.product as CatalogProduct,
		shield: loadout.shield.product as CatalogProduct,
		nav: loadout.nav.product as CatalogProduct,
	};
}

export function resolveTuning(flags: Record<string, string>): ActionTuning {
	return {
		effort: flags.effort ? parseFloat(flags.effort) : DEFAULT_TUNING.effort,
		throttle: flags.throttle ? parseFloat(flags.throttle) : DEFAULT_TUNING.throttle,
		priority: flags.priority ? parseFloat(flags.priority) : DEFAULT_TUNING.priority,
	};
}

export function resolveConstants(flags: Record<string, string>): Constants {
	const constants = { ...DEFAULT_CONSTANTS };

	for (const [key, value] of Object.entries(flags)) {
		if (key.startsWith('const.')) {
			const name = key.slice(6) as keyof Constants;
			if (name in constants) {
				constants[name] = parseFloat(value);
			}
		}
	}

	return constants;
}

export function loadoutSlugs(loadout: Loadout): Record<string, string> {
	return {
		hull: loadout.hull.slug,
		core: loadout.core.product.slug,
		drive: loadout.drive.product.slug,
		sensor: loadout.sensor.product.slug,
		shield: loadout.shield.product.slug,
		nav: loadout.nav.product.slug,
	};
}
