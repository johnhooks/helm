import { createSelector } from '@wordpress/data';
import type { HelmError } from '@helm/errors';
import { isFulfilled, isScanRoute } from '../guards';
import type { DraftAction, QueryMeta, ShipAction, ShipActionType, State } from './types';
import { createIndexQueryId } from './utils';

export const getActions = createSelector(
	( state: State, shipId: number ): ShipAction[] => {
		const ids = state.actions.queries[ createIndexQueryId( shipId ) ];
		if ( ! ids ) {
			return [];
		}
		return ids.map( ( id ) => state.actions.byId[ id ] ).filter( Boolean ) as ShipAction[];
	},
	( state: State, shipId: number ) => [
		state.actions.queries[ createIndexQueryId( shipId ) ],
		state.actions.byId,
	]
);

export const getAction = (
	state: State,
	actionId: number
): ShipAction | null => state.actions.byId[ actionId ] ?? null;

export const getLatestAction = createSelector(
	( state: State, type?: ShipActionType ): ShipAction | null => {
		let latest: ShipAction | null = null;
		for ( const action of Object.values( state.actions.byId ) ) {
			if ( type && action.type !== type ) {
				continue;
			}
			if ( ! latest || action.id > latest.id ) {
				latest = action;
			}
		}
		return latest;
	},
	( state: State ) => [ state.actions.byId ]
);

/**
 * Returns true if any loaded scan_route action with a fulfilled or partial
 * status targets the given node_id. Used to gate UI that requires a known
 * route (e.g. hiding "Scan Route" once it's been run, enabling "Jump").
 *
 * TEMPORARY. This is an interim source of truth — it only considers scan
 * actions currently in state, so pagination or a fresh session loses
 * history. The real question is graph-shaped: "is there an edge, or a
 * chain of edges, from our current node that reaches the target?" Once
 * discovered edges are persisted in the datacore (see nav-06), this
 * selector should be replaced by a datacore query against the edge graph.
 */
export const hasFulfilledScanRouteTo = createSelector(
	( state: State, nodeId: number ): boolean => {
		for ( const action of Object.values( state.actions.byId ) ) {
			if ( ! isScanRoute( action ) || ! isFulfilled( action ) ) {
				continue;
			}
			if ( action.params.target_node_id === nodeId ) {
				return true;
			}
		}
		return false;
	},
	( state: State ) => [ state.actions.byId ]
);

export const getDraft = (
	state: State
): DraftAction | null => state.create.isDraft ? state.create.action : null;

export const isCreating = (
	state: State
): boolean => state.create.isSubmitting;

export const getCreateError = (
	state: State
): HelmError | null => state.create.error;

export const getQueryMeta = (
	state: State,
	shipId: number
): QueryMeta | null => state.actions.meta[ createIndexQueryId( shipId ) ] ?? null;

export const canLoadMore = (
	state: State,
	shipId: number
): boolean => {
	const meta = state.actions.meta[ createIndexQueryId( shipId ) ];
	return !! meta?.next;
};

export const isLoading = (
	state: State,
	shipId: number
): boolean => {
	const meta = state.actions.meta[ createIndexQueryId( shipId ) ];
	return meta?.isLoading === true;
};

export const isLoadingAction = (
	state: State,
	actionId: number
): boolean => state.actions.isLoading[ actionId ] ?? false;

export const getActionError = (
	state: State,
	actionId: number
): HelmError | null => state.actions.error[ actionId ] ?? null;

export const getHeartbeatCursor = (
	state: State
): string | null => state.heartbeat.cursor;
