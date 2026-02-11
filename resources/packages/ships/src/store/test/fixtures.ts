import type { Product, ProductEmbed, ShipState, SystemComponent } from '@helm/types';
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

export function createProductEmbed(
	overrides: Partial< Product > = {}
): ProductEmbed {
	return {
		id: 10,
		slug: 'epoch_s',
		type: 'core',
		label: 'Epoch-S Standard',
		version: 1,
		hp: null,
		footprint: 4,
		rate: 0.5,
		range: null,
		capacity: null,
		chance: null,
		mult_a: 1.0,
		mult_b: 0.8,
		mult_c: null,
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
