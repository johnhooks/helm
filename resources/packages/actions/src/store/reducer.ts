import { combineReducers } from '@wordpress/data';
import type { Action, State } from './types';
import { createIndexQueryId } from './utils';

export function initializeDefaultState(): State {
	return {
		actions: {
			byId: {},
			queries: {},
			meta: {},
			isLoading: {},
			error: {},
		},
		create: {
			action: null,
			isDraft: false,
			isSubmitting: false,
			error: null,
		},
	};
}

function prependActionId(ids: number[], actionId: number): number[] {
	if (ids.includes(actionId)) {
		return ids;
	}

	return [actionId, ...ids].sort((a, b) => b - a);
}

function prependActionToLoadedQueries(
	queries: State['actions']['queries'],
	action: { id: number; ship_post_id: number }
): State['actions']['queries'] {
	const baseQueryId = createIndexQueryId(action.ship_post_id);
	let nextQueries = queries;

	for (const [queryId, ids] of Object.entries(queries)) {
		if (queryId !== baseQueryId) {
			continue;
		}

		const nextIds = prependActionId(ids, action.id);
		if (nextIds === ids) {
			continue;
		}

		if (nextQueries === queries) {
			nextQueries = { ...queries };
		}

		nextQueries[queryId] = nextIds;
	}

	return nextQueries;
}

function actions(state: State['actions'], action: Action): State['actions'] {
	switch (action.type) {
		case 'CREATE_ACTION_FINISHED': {
			const queryId = createIndexQueryId(action.action.ship_post_id);
			const existingIds = state.queries[queryId];
			return {
				...state,
				byId: { ...state.byId, [action.action.id]: action.action },
				...(existingIds && {
					queries: {
						...state.queries,
						[queryId]: [action.action.id, ...existingIds],
					},
				}),
			};
		}
		case 'FETCH_ACTION_START': {
			const { [action.actionId]: _, ...remainingErrors } = state.error;
			return {
				...state,
				isLoading: { ...state.isLoading, [action.actionId]: true },
				error: remainingErrors,
			};
		}
		case 'FETCH_ACTION_FINISHED': {
			const { [action.action.id]: _l, ...remainingLoading } =
				state.isLoading;
			const { [action.action.id]: _e, ...remainingErrors } = state.error;
			return {
				...state,
				byId: { ...state.byId, [action.action.id]: action.action },
				isLoading: remainingLoading,
				error: remainingErrors,
			};
		}
		case 'FETCH_ACTION_FAILED': {
			const { [action.actionId]: _, ...remainingLoading } =
				state.isLoading;
			return {
				...state,
				isLoading: remainingLoading,
				error: { ...state.error, [action.actionId]: action.error },
			};
		}
		case 'RECEIVE_ACTION':
			return {
				...state,
				byId: { ...state.byId, [action.action.id]: action.action },
			};
		case 'RECEIVE_HEARTBEAT': {
			if (action.actions.length === 0) {
				return state;
			}
			const mergedById = { ...state.byId };
			let queries = state.queries;
			for (const a of action.actions) {
				mergedById[a.id] = a;
				queries = prependActionToLoadedQueries(queries, a);
			}
			return { ...state, byId: mergedById, queries };
		}
		case 'FETCH_ACTIONS_START':
			return {
				...state,
				meta: {
					...state.meta,
					[action.queryId]: {
						...(state.meta[action.queryId] ?? { next: null }),
						isLoading: true,
						error: null,
					},
				},
			};
		case 'FETCH_ACTIONS_FINISHED': {
			const newById = { ...state.byId };
			const newIds: number[] = [];
			for (const a of action.actions) {
				newById[a.id] = a;
				newIds.push(a.id);
			}
			return {
				...state,
				byId: newById,
				queries: {
					...state.queries,
					[action.queryId]: newIds,
				},
				meta: {
					...state.meta,
					[action.queryId]: {
						next: action.next,
						isLoading: false,
						error: null,
					},
				},
			};
		}
		case 'FETCH_ACTIONS_FAILED':
			return {
				...state,
				meta: {
					...state.meta,
					[action.queryId]: {
						...(state.meta[action.queryId] ?? { next: null }),
						isLoading: false,
						error: action.error,
					},
				},
			};
		case 'LOAD_MORE_START':
			return {
				...state,
				meta: {
					...state.meta,
					[action.queryId]: {
						...(state.meta[action.queryId] ?? {
							next: null,
							error: null,
						}),
						isLoading: true,
						error: null,
					},
				},
			};
		case 'LOAD_MORE_FINISHED': {
			const mergedById = { ...state.byId };
			const appendedIds: number[] = [];
			for (const a of action.actions) {
				mergedById[a.id] = a;
				appendedIds.push(a.id);
			}
			const existingIds = state.queries[action.queryId] ?? [];
			return {
				...state,
				byId: mergedById,
				queries: {
					...state.queries,
					[action.queryId]: [...existingIds, ...appendedIds],
				},
				meta: {
					...state.meta,
					[action.queryId]: {
						next: action.next,
						isLoading: false,
						error: null,
					},
				},
			};
		}
		case 'LOAD_MORE_FAILED':
			return {
				...state,
				meta: {
					...state.meta,
					[action.queryId]: {
						...(state.meta[action.queryId] ?? { next: null }),
						isLoading: false,
						error: action.error,
					},
				},
			};
		default:
			return state;
	}
}

function create(state: State['create'], action: Action): State['create'] {
	switch (action.type) {
		case 'CREATE_DRAFT':
			return {
				action: action.action,
				isDraft: true,
				isSubmitting: false,
				error: null,
			};
		case 'CLEAR_DRAFT':
		case 'CREATE_ACTION_FINISHED':
			return {
				action: null,
				isDraft: false,
				isSubmitting: false,
				error: null,
			};
		case 'CREATE_ACTION_START':
			return {
				...state,
				isSubmitting: true,
				error: null,
			};
		case 'CREATE_ACTION_FAILED':
			return {
				...state,
				isSubmitting: false,
				error: action.error,
			};
		default:
			return state;
	}
}

export const reducer = combineReducers({ actions, create });
