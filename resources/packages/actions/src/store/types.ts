import type { HelmError } from '@helm/errors';
import type { ActionContract } from '../contracts';

export type ShipActionType =
	| 'scan_route'
	| 'jump'
	| 'survey'
	| 'scan_planet'
	| 'mine'
	| 'refine'
	| 'buy'
	| 'sell'
	| 'transfer'
	| 'repair'
	| 'upgrade';

export type ShipActionStatus = 'pending' | 'running' | 'fulfilled' | 'partial' | 'failed';

export interface ShipAction< T extends ShipActionType = ShipActionType > {
	id: number;
	ship_post_id: number;
	type: T;
	status: ShipActionStatus;
	params: ActionContract< T >[ 'params' ];
	result:
		| ActionContract< T >[ 'activeResult' ]
		| ActionContract< T >[ 'fulfilledResult' ]
		| ActionContract< T >[ 'failedResult' ]
		| null;
	deferred_until: string | null;
	created_at: string;
	updated_at: string;
}

export type DraftAction< T extends ShipActionType = ShipActionType > = {
	type: T;
	params: ActionContract< T >[ 'params' ];
};

export interface QueryMeta {
	next: string | null;
	isLoading: boolean;
	error: HelmError | null;
}

export interface ActionsState {
	byId: Record< number, ShipAction >;
	queries: Record< string, number[] >;
	meta: Record< string, QueryMeta >;
	isLoading: Record< string, boolean >;
	error: Record< string, HelmError >;
}

export interface CreateState {
	action: DraftAction | null;
	isDraft: boolean;
	isSubmitting: boolean;
	error: HelmError | null;
}

export interface HeartbeatState {
	cursor: string | null;
}

export interface State {
	actions: ActionsState;
	create: CreateState;
	heartbeat: HeartbeatState;
}

export type Action =
	| { type: 'CREATE_ACTION_START' }
	| { type: 'CREATE_ACTION_FINISHED'; action: ShipAction }
	| { type: 'CREATE_ACTION_FAILED'; error: HelmError }
	| { type: 'FETCH_ACTION_START'; actionId: number }
	| { type: 'FETCH_ACTION_FINISHED'; action: ShipAction }
	| { type: 'FETCH_ACTION_FAILED'; actionId: number; error: HelmError }
	| { type: 'RECEIVE_ACTION'; action: ShipAction }
	| { type: 'RECEIVE_HEARTBEAT'; actions: ShipAction[]; cursor: string }
	| { type: 'CREATE_DRAFT'; action: DraftAction }
	| { type: 'CLEAR_DRAFT' }
	| { type: 'FETCH_ACTIONS_START'; queryId: string }
	| { type: 'FETCH_ACTIONS_FINISHED'; queryId: string; actions: ShipAction[]; next: string | null }
	| { type: 'FETCH_ACTIONS_FAILED'; queryId: string; error: HelmError }
	| { type: 'LOAD_MORE_START'; queryId: string }
	| { type: 'LOAD_MORE_FINISHED'; queryId: string; actions: ShipAction[]; next: string | null }
	| { type: 'LOAD_MORE_FAILED'; queryId: string; error: HelmError };
