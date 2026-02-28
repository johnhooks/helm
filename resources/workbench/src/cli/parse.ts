import type { ActionTuning, Constants, ComponentType, Hull, Loadout } from '../types';
import { DEFAULT_CONSTANTS, DEFAULT_TUNING } from '../types';
import { getProduct, getProductsByType, defaults } from '../data/products';
import { HULLS } from '../data/hulls';

export const COMPONENT_TYPES: ComponentType[] = ['core', 'drive', 'sensor', 'shield', 'nav'];

export const DEFAULT_SLUGS: Record<'hull' | ComponentType, string> = {
	hull: 'pioneer',
	core: defaults.core.slug,
	drive: defaults.drive.slug,
	sensor: defaults.sensor.slug,
	shield: defaults.shield.slug,
	nav: defaults.nav.slug,
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

function resolveHull(slug: string): Hull {
	const hull = HULLS.find((h) => h.slug === slug);
	if (!hull) {
		const valid = HULLS.map((h) => h.slug).join(', ');
		throw new Error(`Unknown hull "${slug}". Valid: ${valid}`);
	}
	return hull;
}

export function hydrateLoadout(flags: Record<string, string>): Loadout {
	const hullSlug = flags.hull ?? DEFAULT_SLUGS.hull;
	const hull = resolveHull(hullSlug);

	const components: Record<string, ReturnType<typeof getProduct>> = {};
	for (const type of COMPONENT_TYPES) {
		const slug = flags[type] ?? DEFAULT_SLUGS[type];
		const product = getProduct(slug);
		if (!product) {
			const valid = getProductsByType(type)
				.map((p) => p.slug)
				.join(', ');
			throw new Error(`Unknown ${type} "${slug}". Valid: ${valid}`);
		}
		if (product.type !== type) {
			throw new Error(`Product "${slug}" is type "${product.type}", expected "${type}"`);
		}
		components[type] = product;
	}

	return {
		hull,
		core: components.core!,
		drive: components.drive!,
		sensor: components.sensor!,
		shield: components.shield!,
		nav: components.nav!,
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
		core: loadout.core.slug,
		drive: loadout.drive.slug,
		sensor: loadout.sensor.slug,
		shield: loadout.shield.slug,
		nav: loadout.nav.slug,
	};
}
