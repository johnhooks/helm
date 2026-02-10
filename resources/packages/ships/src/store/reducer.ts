import { combineReducers } from '@wordpress/data';
import type { Action, State } from './types';

function ships( state: State[ 'ships' ], action: Action ): State[ 'ships' ] {
	switch ( action.type ) {
		case 'FETCH_SHIP_START': {
			const { [ action.shipId ]: _removed, ...restErrors } =
				state.errors;
			return {
				...state,
				isLoading: { ...state.isLoading, [ action.shipId ]: true },
				errors: restErrors,
			};
		}
		case 'FETCH_SHIP_FINISHED': {
			const { [ action.shipId ]: _removed, ...restErrors } =
				state.errors;
			return {
				byId: { ...state.byId, [ action.shipId ]: action.ship },
				isLoading: {
					...state.isLoading,
					[ action.shipId ]: false,
				},
				errors: restErrors,
			};
		}
		case 'FETCH_SHIP_FAILED':
			return {
				...state,
				isLoading: {
					...state.isLoading,
					[ action.shipId ]: false,
				},
				errors: {
					...state.errors,
					[ action.shipId ]: action.error,
				},
			};
		default:
			return state;
	}
}

export function initializeDefaultState(): State {
	return {
		ships: {
			byId: {},
			isLoading: {},
			errors: {},
		},
	};
}

export const reducer = combineReducers( { ships } );
