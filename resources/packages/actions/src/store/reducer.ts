import type { Action, CreateState, State } from './types';

const DEFAULT_CREATE: CreateState = {
	action: null,
	isDraft: false,
	isSubmitting: false,
	error: null,
};

export function initializeDefaultState(): State {
	return {
		actions: {
			byShipId: {},
			errors: {},
		},
		create: { ...DEFAULT_CREATE },
		meta: {
			cursor: null,
		},
	};
}

export function reducer( state: State = initializeDefaultState(), action: Action ): State {
	switch ( action.type ) {
		case 'CREATE_DRAFT':
			return {
				...state,
				create: {
					...DEFAULT_CREATE,
					action: action.action,
					isDraft: true,
				},
			};
		case 'CLEAR_DRAFT':
			return {
				...state,
				create: { ...DEFAULT_CREATE },
			};
		case 'CREATE_ACTION_START':
			return {
				...state,
				create: {
					...state.create,
					isSubmitting: true,
					error: null,
				},
			};
		case 'CREATE_ACTION_FINISHED':
			return {
				...state,
				actions: {
					...state.actions,
					byShipId: { ...state.actions.byShipId, [ action.shipId ]: action.action },
				},
				create: { ...DEFAULT_CREATE },
			};
		case 'CREATE_ACTION_FAILED':
			return {
				...state,
				create: {
					...state.create,
					isSubmitting: false,
					error: action.error,
				},
			};
		case 'FETCH_ACTION_START':
			return state;
		case 'FETCH_ACTION_FINISHED':
			return {
				...state,
				actions: {
					...state.actions,
					byShipId: { ...state.actions.byShipId, [ action.shipId ]: action.action },
				},
			};
		case 'FETCH_ACTION_FAILED':
			return {
				...state,
				actions: {
					...state.actions,
					errors: { ...state.actions.errors, [ action.shipId ]: action.error },
				},
			};
		case 'RECEIVE_ACTION':
			return {
				...state,
				actions: {
					...state.actions,
					byShipId: { ...state.actions.byShipId, [ action.shipId ]: action.action },
				},
			};
		case 'RECEIVE_HEARTBEAT': {
			if ( action.actions.length === 0 ) {
				return { ...state, meta: { ...state.meta, cursor: action.cursor } };
			}
			const merged = { ...state.actions.byShipId };
			for ( const a of action.actions ) {
				merged[ a.ship_post_id ] = a;
			}
			return {
				...state,
				actions: { ...state.actions, byShipId: merged },
				meta: { ...state.meta, cursor: action.cursor },
			};
		}
		case 'CLEAR_ACTION':
			return {
				...state,
				actions: {
					...state.actions,
					byShipId: { ...state.actions.byShipId, [ action.shipId ]: null },
					errors: { ...state.actions.errors, [ action.shipId ]: null },
				},
			};
		default:
			return state;
	}
}
