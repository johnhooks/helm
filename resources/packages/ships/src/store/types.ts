import type { HelmError } from '@helm/errors';
import { LinkRel } from '@helm/types';
import type { ShipState, SystemComponentResponse, WithRestLinks } from '@helm/types';

export type Action =
	| { type: 'FETCH_SHIP_START' }
	| { type: 'FETCH_SHIP_FINISHED'; ship: WithRestLinks< ShipState > }
	| { type: 'FETCH_SHIP_FAILED'; error: HelmError }
	| { type: 'FETCH_SYSTEMS_START' }
	| { type: 'FETCH_SYSTEMS_FINISHED'; systems: SystemComponentResponse[] }
	| { type: 'FETCH_SYSTEMS_FAILED'; error: HelmError }
	| { type: 'RECEIVE_SHIP'; ship: WithRestLinks< ShipState > }
	| { type: 'RECEIVE_SYSTEMS'; systems: SystemComponentResponse[] }
	| { type: 'EDIT_SHIP'; edits: Partial< ShipState > }
	| { type: 'PATCH_SHIP_START'; edits?: Partial< ShipState > }
	| { type: 'PATCH_SHIP_FINISHED'; ship: WithRestLinks< ShipState > }
	| { type: 'PATCH_SHIP_FAILED'; error: HelmError };

export interface EditsState {
	ship: Partial< ShipState > | null;
	isSubmitting: boolean;
	error: HelmError | null;
}

export interface State {
	ship: WithRestLinks< ShipState > | null;
	shipError: HelmError | null;
	systems: SystemComponentResponse[] | null;
	systemsError: HelmError | null;
	edits: EditsState;
}

export type ShipEmbeds = {
	[ LinkRel.Systems ]?: SystemComponentResponse[];
};

export type ShipResponse = WithRestLinks< ShipState > & {
	_embedded?: ShipEmbeds;
};
