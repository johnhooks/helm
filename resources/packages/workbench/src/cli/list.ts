import { getAllProducts, getProductsByType } from '../data/products';
import { HULLS } from '../data/hulls';
import type { ParsedFlags } from './parse';
import type { ComponentType } from '../types';

export function list({ positional, flags }: ParsedFlags): void {
	const subject = positional[1];

	switch (subject) {
		case 'products': {
			const type = flags.type as ComponentType | undefined;
			const products = type ? getProductsByType(type) : getAllProducts();
			const out = products.map((p) => ({
				slug: p.slug,
				type: p.type,
				label: p.label,
				footprint: p.footprint,
			}));
			console.log(JSON.stringify(out, null, 2)); // eslint-disable-line no-console
			break;
		}

		case 'hulls': {
			const out = HULLS.map((h) => ({
				slug: h.slug,
				label: h.label,
				internalSpace: h.internalSpace,
				equipmentSlots: h.equipmentSlots,
			}));
			console.log(JSON.stringify(out, null, 2)); // eslint-disable-line no-console
			break;
		}

		default:
			console.error(`Unknown list subject "${subject}". Use: products, hulls`); // eslint-disable-line no-console
			process.exit(1);
	}
}
