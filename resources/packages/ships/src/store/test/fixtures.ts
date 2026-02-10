import type { ShipState } from '@helm/types';
import type { State } from '../types';
import { initializeDefaultState } from '../reducer';

export function createShipState(
	overrides: Partial< ShipState > = {}
): ShipState {
	return {
		id: 1,
		node_id: 100,
		power_full_at: '2025-01-01T00:00:00+00:00',
		shields_full_at: '2025-01-01T00:00:00+00:00',
		hull_integrity: 100,
		cargo: {},
		current_action_id: null,
		...overrides,
	};
}

export function createState( overrides: Partial< State[ 'ships' ] > = {} ): State {
	const defaults = initializeDefaultState();
	return {
		ships: {
			...defaults.ships,
			...overrides,
		},
	};
}
