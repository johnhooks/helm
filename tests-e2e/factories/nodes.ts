export interface NodeOverrides {
	id?: number;
	type?: string;
	x?: number;
	y?: number;
	z?: number;
	created_at?: string | null;
}

export function makeNode(overrides: NodeOverrides = {}) {
	const id = overrides.id ?? 1;
	return {
		id,
		type: overrides.type ?? 'star_system',
		x: overrides.x ?? id * 10,
		y: overrides.y ?? id * 20,
		z: overrides.z ?? id * 30,
		created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
	};
}

/**
 * Make an API node response with optional embedded stars.
 *
 * This matches the shape returned by /helm/v1/nodes?_embed=helm:stars.
 */
export function makeApiNode(id: number, stars?: Record<string, unknown>[]) {
	const node: Record<string, unknown> = makeNode({ id });

	if (stars) {
		node._embedded = { 'helm:stars': stars };
	}

	return node;
}
