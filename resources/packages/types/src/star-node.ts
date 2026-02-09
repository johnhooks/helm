/**
 * Combined Star + NavNode for the star map.
 *
 * One row per primary star — the main visual dot on the map.
 * Property names match SQL column names exactly (snake_case).
 */
export interface StarNode {
	id: number;
	node_id: number;
	title: string;
	catalog_id: string;
	spectral_class: string | null;
	x: number;
	y: number;
	z: number;
	mass: number | null;
	radius: number | null;
	node_type: string;
}
