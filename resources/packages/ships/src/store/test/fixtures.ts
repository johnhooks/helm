import type {
	Product,
	ProductEmbed,
	ShipState,
	SystemComponent,
	WithRestLinks,
} from '@helm/types';
import type { EditsState, State, SystemsState } from '../types';
import { initializeDefaultState } from '../reducer';

export function createShipState(overrides: Partial<ShipState> = {}): ShipState {
	return {
		id: 1,
		node_id: 100,
		power_mode: 'normal',
		power_full_at: '2025-01-01T00:00:00+00:00',
		power_max: 100,
		shields_full_at: '2025-01-01T00:00:00+00:00',
		shields_max: 100,
		hull_integrity: 100,
		hull_max: 100,
		current_action_id: null,
		created_at: '2025-01-01T00:00:00+00:00',
		updated_at: '2025-01-01T00:00:00+00:00',
		...overrides,
	};
}

export function createSystemComponent(
	overrides: Partial<SystemComponent> = {}
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
	overrides: Partial<Product> = {}
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
		sustain: null,
		capacity: null,
		chance: null,
		mult_a: 1.0,
		mult_b: 0.8,
		mult_c: null,
		mult_d: null,
		mult_e: null,
		mult_f: null,
		...overrides,
	};
}

export function createEditsState(
	overrides: Partial<EditsState> = {}
): EditsState {
	return {
		ship: null,
		isSubmitting: false,
		error: null,
		...overrides,
	};
}

export function createState(
	overrides: {
		shipState?: WithRestLinks<ShipState> | null;
		shipError?: State['shipError'];
		systems?: Partial<SystemsState>;
		edits?: Partial<EditsState>;
	} = {}
): State {
	const defaults = initializeDefaultState();
	return {
		shipState: overrides.shipState ?? defaults.shipState,
		shipError: overrides.shipError ?? defaults.shipError,
		systems: { ...defaults.systems, ...overrides.systems },
		edits: { ...defaults.edits, ...overrides.edits },
	};
}
