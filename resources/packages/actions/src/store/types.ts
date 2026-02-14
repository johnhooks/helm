import type { HelmError } from '@helm/errors';

export interface ShipAction {
	id: number;
	ship_post_id: number;
	type: string;
	status: 'pending' | 'running' | 'fulfilled' | 'partial' | 'failed';
	params: Record< string, unknown >;
	result: Record< string, unknown > | null;
	deferred_until: string | null;
	created_at: string;
	updated_at: string;
}

export type DraftAction = Pick< ShipAction, 'type' | 'params' >;

export interface ActionsState {
	byShipId: Record< number, ShipAction | null >;
	errors: Record< number, HelmError | null >;
}

export interface CreateState {
	action: DraftAction | null;
	isDraft: boolean;
	isSubmitting: boolean;
	error: HelmError | null;
}

export interface MetaState {
	cursor: string | null;
}

export interface State {
	actions: ActionsState;
	create: CreateState;
	meta: MetaState;
}

export type Action =
	| { type: 'CREATE_ACTION_START'; shipId: number }
	| { type: 'CREATE_ACTION_FINISHED'; shipId: number; action: ShipAction }
	| { type: 'CREATE_ACTION_FAILED'; shipId: number; error: HelmError }
	| { type: 'FETCH_ACTION_START'; shipId: number }
	| { type: 'FETCH_ACTION_FINISHED'; shipId: number; action: ShipAction | null }
	| { type: 'FETCH_ACTION_FAILED'; shipId: number; error: HelmError }
	| { type: 'RECEIVE_ACTION'; shipId: number; action: ShipAction }
	| { type: 'RECEIVE_HEARTBEAT'; actions: ShipAction[]; cursor: string }
	| { type: 'CLEAR_ACTION'; shipId: number }
	| { type: 'CREATE_DRAFT'; action: DraftAction }
	| { type: 'CLEAR_DRAFT' };
