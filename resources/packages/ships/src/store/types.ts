import type { HelmError } from '@helm/errors';
import type { ShipState } from '@helm/types';

export type Action =
	| { type: 'FETCH_SHIP_START'; shipId: number }
	| { type: 'FETCH_SHIP_FINISHED'; shipId: number; ship: ShipState }
	| { type: 'FETCH_SHIP_FAILED'; shipId: number; error: HelmError };

export interface State {
	ships: {
		byId: Record< number, ShipState >;
		isLoading: Record< number, boolean >;
		errors: Record< number, HelmError >;
	};
}
