import type { Action, State } from './types';

export function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'FETCH_PRODUCT_START': {
			const { [action.productId]: _removed, ...restErrors } =
				state.errors;
			return {
				...state,
				isLoading: { ...state.isLoading, [action.productId]: true },
				errors: restErrors,
			};
		}
		case 'FETCH_PRODUCT_FINISHED': {
			const { [action.productId]: _removed, ...restErrors } =
				state.errors;
			return {
				byId: { ...state.byId, [action.productId]: action.product },
				isLoading: {
					...state.isLoading,
					[action.productId]: false,
				},
				errors: restErrors,
			};
		}
		case 'FETCH_PRODUCT_FAILED':
			return {
				...state,
				isLoading: {
					...state.isLoading,
					[action.productId]: false,
				},
				errors: {
					...state.errors,
					[action.productId]: action.error,
				},
			};
		case 'RECEIVE_PRODUCT':
			return {
				...state,
				byId: { ...state.byId, [action.product.id]: action.product },
			};
		case 'RECEIVE_PRODUCTS': {
			const merged = { ...state.byId };
			for (const product of action.products) {
				merged[product.id] = product;
			}
			return { ...state, byId: merged };
		}
		default:
			return state;
	}
}

export function initializeDefaultState(): State {
	return {
		byId: {},
		isLoading: {},
		errors: {},
	};
}
