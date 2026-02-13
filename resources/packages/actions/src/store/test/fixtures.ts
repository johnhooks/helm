import type { ShipAction, State } from '../types';
import { initializeDefaultState } from '../reducer';

export function createShipAction(
	overrides: Partial< ShipAction > = {}
): ShipAction {
	return {
		id: 1,
		ship_post_id: 1,
		type: 'scan_route',
		status: 'running',
		params: {},
		result: null,
		deferred_until: null,
		created_at: '2025-01-01T00:00:00+00:00',
		updated_at: '2025-01-01T00:00:00+00:00',
		...overrides,
	};
}

export function createState(
	overrides: {
		actions?: Partial< State[ 'actions' ] >;
		meta?: Partial< State[ 'meta' ] >;
	} = {}
): State {
	const defaults = initializeDefaultState();
	return {
		actions: { ...defaults.actions, ...overrides.actions },
		meta: { ...defaults.meta, ...overrides.meta },
	};
}
