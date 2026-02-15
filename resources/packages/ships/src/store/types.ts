import type { HelmError } from '@helm/errors';
import { LinkRel } from '@helm/types';
import type { ShipState, SystemComponentResponse, WithRestLinks } from '@helm/types';

export type Action =
	| { type: 'FETCH_SHIP_FINISHED'; ship: WithRestLinks< ShipState > }
	| { type: 'FETCH_SHIP_FAILED'; error: HelmError }
	| { type: 'FETCH_SYSTEMS_FINISHED'; systems: SystemComponentResponse[] }
	| { type: 'FETCH_SYSTEMS_FAILED'; error: HelmError }
	| { type: 'RECEIVE_SHIP'; ship: WithRestLinks< ShipState > }
	| { type: 'RECEIVE_SYSTEMS'; systems: SystemComponentResponse[] }
	| { type: 'EDIT_SHIP'; edits: Partial< ShipState > }
	| { type: 'PATCH_SHIP_START'; edits?: Partial< ShipState > }
	| { type: 'PATCH_SHIP_FINISHED'; ship: WithRestLinks< ShipState > }
	| { type: 'PATCH_SHIP_FAILED'; error: HelmError };

// "ShipSlice" to avoid collision with the ShipState domain type.
export interface ShipSlice {
	ship: WithRestLinks< ShipState > | null;
	error: HelmError | null;
}

export interface SystemsState {
	systems: SystemComponentResponse[] | null;
	error: HelmError | null;
}

export interface EditsState {
	ship: Partial< ShipState > | null;
	isSubmitting: boolean;
	error: HelmError | null;
}

export interface State {
	ship: ShipSlice;
	systems: SystemsState;
	edits: EditsState;
}

export type ShipEmbeds = {
	[ LinkRel.Systems ]?: SystemComponentResponse[];
};

export type ShipResponse = WithRestLinks< ShipState > & {
	_embedded?: ShipEmbeds;
};
