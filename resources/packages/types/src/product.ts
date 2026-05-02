import type { WithRestLinks } from './rest';

export interface Product {
	id: number;
	slug: string;
	type: string;
	label: string;
	version: number;
	hp: number | null;
	footprint: number;
	rate: number | null;
	sustain: number | null;
	capacity: number | null;
	chance: number | null;
	mult_a: number | null;
	mult_b: number | null;
	mult_c: number | null;
	mult_d: number | null;
	mult_e: number | null;
	mult_f: number | null;
}

export type ProductEmbed = WithRestLinks<Product>;
