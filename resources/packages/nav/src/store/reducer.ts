import type { StarNode } from '@helm/types';
import type { Action, State } from './types';

function toById( nodes: StarNode[] ): Record< number, StarNode > {
	const byId: Record< number, StarNode > = {};
	for ( const node of nodes ) {
		byId[ node.node_id ] = node;
	}
	return byId;
}

export function reducer( state: State, action: Action ): State {
	switch ( action.type ) {
		case 'SYNC_START':
			return {
				...state,
				stars: {
					...state.stars,
					syncStatus: 'syncing',
					error: null,
				},
			};
		case 'SYNC_FINISHED':
			return {
				...state,
				stars: {
					byId: toById( action.nodes ),
					syncStatus: 'synced',
					syncResult: action.syncResult,
					error: null,
				},
			};
		case 'EDGE_SYNC_FINISHED':
			return {
				...state,
				stars: {
					...state.stars,
					syncResult: state.stars.syncResult
						? {
							...state.stars.syncResult,
							edges: action.edges,
						}
						: null,
					error: null,
				},
			};
		case 'SYNC_FAILED':
			return {
				...state,
				stars: {
					...state.stars,
					syncStatus: 'error',
					error: action.error,
				},
			};
		default:
			return state;
	}
}

export function initializeDefaultState(): State {
	return {
		stars: {
			byId: {},
			syncStatus: 'idle',
			syncResult: null,
			error: null,
		},
	};
}
