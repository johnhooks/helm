import type { ShipState, SystemComponent } from '@helm/types';
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

export function createSystemComponent(
	overrides: Partial< SystemComponent > = {}
): SystemComponent {
	return {
		id: 1,
		product_id: 10,
		slot: 'shields',
		life: null,
		usage_count: 0,
		condition: 1.0,
		created_at: '2025-01-01 00:00:00',
		updated_at: '2025-01-01 00:00:00',
		...overrides,
	};
}

export function createState(
	overrides: {
		ships?: Partial< State[ 'ships' ] >;
		systems?: Partial< State[ 'systems' ] >;
	} = {}
): State {
	const defaults = initializeDefaultState();
	return {
		ships: {
			...defaults.ships,
			...overrides.ships,
		},
		systems: {
			...defaults.systems,
			...overrides.systems,
		},
	};
}
