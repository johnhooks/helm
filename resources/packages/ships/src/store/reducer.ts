import type { Action, EditsState, State } from './types';

const INITIAL_EDITS: EditsState = {
	ship: null,
	isSubmitting: false,
	error: null,
};

export function initializeDefaultState(): State {
	return {
		ship: null,
		shipError: null,
		systems: null,
		systemsError: null,
		edits: { ...INITIAL_EDITS },
	};
}

export function reducer( state: State = initializeDefaultState(), action: Action ): State {
	switch ( action.type ) {
		case 'FETCH_SHIP_START':
			return state;

		case 'FETCH_SHIP_FINISHED':
		case 'RECEIVE_SHIP':
			return {
				...state,
				ship: action.ship,
				shipError: null,
			};

		case 'FETCH_SHIP_FAILED':
			return {
				...state,
				shipError: action.error,
			};

		case 'FETCH_SYSTEMS_START':
			return state;

		case 'FETCH_SYSTEMS_FINISHED':
		case 'RECEIVE_SYSTEMS':
			return {
				...state,
				systems: action.systems,
				systemsError: null,
			};

		case 'FETCH_SYSTEMS_FAILED':
			return {
				...state,
				systemsError: action.error,
			};

		case 'EDIT_SHIP':
			return {
				...state,
				edits: {
					...state.edits,
					ship: { ...state.edits.ship, ...action.edits },
				},
			};

		case 'PATCH_SHIP_START':
			return {
				...state,
				edits: {
					ship: action.edits
						? { ...state.edits.ship, ...action.edits }
						: state.edits.ship,
					isSubmitting: true,
					error: null,
				},
			};

		case 'PATCH_SHIP_FINISHED':
			return {
				...state,
				ship: action.ship,
				edits: { ...INITIAL_EDITS },
			};

		case 'PATCH_SHIP_FAILED':
			return {
				...state,
				edits: {
					...state.edits,
					isSubmitting: false,
					error: action.error,
				},
			};

		default:
			return state;
	}
}
