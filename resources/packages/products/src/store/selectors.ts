import { assert, ErrorCode } from '@helm/errors';
import type { HelmError } from '@helm/errors';
import type { Product, WithRestLinks } from '@helm/types';
import type { State } from './types';

export const getProduct = (
	state: State,
	productId: number
): WithRestLinks<Product> | undefined => state.byId[productId];

/**
 * @throws {HelmError} When the product has not been preloaded into the store.
 */
export const getPreloadedProduct = (
	state: State,
	productId: number
): WithRestLinks<Product> => {
	const product = state.byId[productId];
	assert(
		product,
		ErrorCode.ProductsNotPreloaded,
		`Expected product to be preloaded: ${productId}`
	);
	return product;
};

export const isProductLoading = (state: State, productId: number): boolean =>
	state.isLoading[productId] ?? false;

export const getProductError = (
	state: State,
	productId: number
): HelmError | undefined => state.errors[productId];
