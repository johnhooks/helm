export interface StarOverrides {
	id?: number;
	node_id?: number;
	title?: string;
	catalog_id?: string;
	spectral_class?: string | null;
	post_type?: string;
	x?: number;
	y?: number;
	z?: number;
	mass?: number | null;
	radius?: number | null;
	is_primary?: boolean;
}

export function makeStar(overrides: StarOverrides = {}) {
	const id = overrides.id ?? 1;
	const nodeId = overrides.node_id ?? 1;
	return {
		id,
		node_id: nodeId,
		title: overrides.title ?? `Star-${id}`,
		catalog_id: overrides.catalog_id ?? `CAT-${id}`,
		spectral_class: overrides.spectral_class ?? 'G2V',
		post_type: overrides.post_type ?? 'helm_star',
		x: overrides.x ?? id,
		y: overrides.y ?? id,
		z: overrides.z ?? id,
		mass: overrides.mass ?? 1.0,
		radius: overrides.radius ?? 1.0,
		is_primary: overrides.is_primary ?? true,
	};
}
