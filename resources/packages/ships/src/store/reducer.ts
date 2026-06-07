import { combineReducers } from '@wordpress/data';
import type { Action, State } from './types';

export function initializeDefaultState(): State {
	return {
		shipState: null,
		shipError: null,
		systems: { systems: null, error: null },
		edits: { ship: null, isSubmitting: false, error: null },
	};
}

function shipState(
	state: State['shipState'],
	action: Action
): State['shipState'] {
	switch (action.type) {
		case 'FETCH_SHIP_FINISHED':
		case 'RECEIVE_SHIP':
		case 'RECEIVE_SHIP_STATE':
		case 'PATCH_SHIP_FINISHED':
			return action.ship;

		default:
			return state;
	}
}

function shipError(
	state: State['shipError'],
	action: Action
): State['shipError'] {
	switch (action.type) {
		case 'FETCH_SHIP_FINISHED':
		case 'RECEIVE_SHIP':
		case 'RECEIVE_SHIP_STATE':
			return null;

		case 'FETCH_SHIP_FAILED':
			return action.error;

		default:
			return state;
	}
}

function systems(state: State['systems'], action: Action): State['systems'] {
	switch (action.type) {
		case 'FETCH_SYSTEMS_FINISHED':
		case 'RECEIVE_SYSTEMS':
			return { ...state, systems: action.systems, error: null };

		case 'FETCH_SYSTEMS_FAILED':
			return { ...state, error: action.error };

		default:
			return state;
	}
}

function edits(state: State['edits'], action: Action): State['edits'] {
	switch (action.type) {
		case 'EDIT_SHIP':
			return { ...state, ship: { ...state.ship, ...action.edits } };

		case 'PATCH_SHIP_START':
			return {
				ship: action.edits
					? { ...state.ship, ...action.edits }
					: state.ship,
				isSubmitting: true,
				error: null,
			};

		case 'PATCH_SHIP_FINISHED':
			return { ship: null, isSubmitting: false, error: null };

		case 'PATCH_SHIP_FAILED':
			return { ...state, isSubmitting: false, error: action.error };

		default:
			return state;
	}
}

export const reducer = combineReducers({
	shipState,
	shipError,
	systems,
	edits,
});
