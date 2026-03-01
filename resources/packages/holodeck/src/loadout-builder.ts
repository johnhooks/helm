import type { Loadout } from './types/loadout';
import type { InstalledComponent } from './types/component';
import type { CatalogProduct } from './types/catalog';
import type { ComponentType } from './data/products';
import { getProduct, getProductsByType, DEFAULT_LOADOUT_SLUGS } from './data/products';
import { getHull, HULLS } from './data/hulls';

function toComponent(product: CatalogProduct, slot: string): InstalledComponent {
	return {
		product,
		slot,
		life: product.hp,
		usageCount: 0,
	};
}

function resolve(type: ComponentType, slug: string): CatalogProduct {
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
	return product;
}

/**
 * Build a holodeck Loadout from catalog slugs.
 *
 * Resolves slugs to products, validates types, wraps in InstalledComponent.
 */
export function buildLoadout(
	hullSlug: string,
	componentSlugs?: Partial<Record<string, string>>,
	equipmentSlugs?: string[],
): Loadout {
	const hull = getHull(hullSlug);
	if (!hull) {
		const valid = HULLS.map((h) => h.slug).join(', ');
		throw new Error(`Unknown hull "${hullSlug}". Valid: ${valid}`);
	}

	const slugs = { ...DEFAULT_LOADOUT_SLUGS, ...componentSlugs };

	return {
		hull,
		core: toComponent(resolve('core', slugs.core), 'core'),
		drive: toComponent(resolve('drive', slugs.drive), 'drive'),
		sensor: toComponent(resolve('sensor', slugs.sensor), 'sensor'),
		shield: toComponent(resolve('shield', slugs.shield), 'shield'),
		nav: toComponent(resolve('nav', slugs.nav), 'nav'),
		equipment: (equipmentSlugs ?? []).map((slug, i) => toComponent(resolve('equipment', slug), `equip_${i + 1}`)),
	};
}
