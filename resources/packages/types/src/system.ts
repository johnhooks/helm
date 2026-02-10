import type { ProductEmbed } from './product';
import { LinkRel } from './rest';
import type { WithRestLinks } from './rest';

export interface SystemComponent {
	id: number;
	product_id: number;
	slot: string;
	life: number | null;
	usage_count: number;
	condition: number;
	created_at: string;
	updated_at: string;
}

export type SystemComponentEmbeds = {
	[ LinkRel.Product ]?: [ ProductEmbed ];
};

/**
 * A system component as returned from the REST API, with optional
 * WP REST `_links` and per-item `_embedded` product data.
 */
export type SystemComponentResponse = WithRestLinks< SystemComponent > & {
	_embedded?: SystemComponentEmbeds;
};
