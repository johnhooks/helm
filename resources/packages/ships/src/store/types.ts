import type { HelmError } from '@helm/errors';
import { LinkRel } from '@helm/types';
import type { ShipState, SystemComponentResponse, WithRestLinks } from '@helm/types';

export type Action =
	| { type: 'FETCH_SHIP_START'; shipId: number }
	| { type: 'FETCH_SHIP_FINISHED'; shipId: number; ship: WithRestLinks< ShipState > }
	| { type: 'FETCH_SHIP_FAILED'; shipId: number; error: HelmError }
	| { type: 'FETCH_SYSTEMS_START'; shipId: number }
	| { type: 'FETCH_SYSTEMS_FINISHED'; shipId: number; systems: SystemComponentResponse[] }
	| { type: 'FETCH_SYSTEMS_FAILED'; shipId: number; error: HelmError }
	| { type: 'PATCH_SHIP_START'; shipId: number }
	| { type: 'PATCH_SHIP_FINISHED'; shipId: number; ship: WithRestLinks< ShipState > }
	| { type: 'PATCH_SHIP_FAILED'; shipId: number; error: HelmError };

export interface State {
	ships: {
		byId: Record< number, WithRestLinks< ShipState > >;
		isLoading: Record< number, boolean >;
		errors: Record< number, HelmError >;
	};
	systems: {
		byShipId: Record< number, SystemComponentResponse[] >;
		isLoading: Record< number, boolean >;
		errors: Record< number, HelmError >;
	};
}

export type ShipEmbeds = {
	[ LinkRel.Systems ]?: SystemComponentResponse[];
};

export type ShipResponse = WithRestLinks< ShipState > & {
	_embedded?: ShipEmbeds;
};
