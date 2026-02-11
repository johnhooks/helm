import type { HelmError } from '@helm/errors';
import type { Product, WithRestLinks } from '@helm/types';
import type { State } from './types';

export const getProduct = (
	state: State,
	productId: number
): WithRestLinks< Product > | undefined => state.byId[ productId ];

export const isProductLoading = (
	state: State,
	productId: number
): boolean => state.isLoading[ productId ] ?? false;

export const getProductError = (
	state: State,
	productId: number
): HelmError | undefined => state.errors[ productId ];
