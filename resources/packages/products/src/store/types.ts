import type { HelmError } from '@helm/errors';
import type { WithRestLinks, Product } from '@helm/types';

export type Action =
	| { type: 'FETCH_PRODUCT_START'; productId: number }
	| {
			type: 'FETCH_PRODUCT_FINISHED';
			productId: number;
			product: WithRestLinks<Product>;
	  }
	| { type: 'FETCH_PRODUCT_FAILED'; productId: number; error: HelmError }
	| { type: 'RECEIVE_PRODUCT'; product: WithRestLinks<Product> }
	| { type: 'RECEIVE_PRODUCTS'; products: WithRestLinks<Product>[] };

export interface State {
	byId: Record<number, WithRestLinks<Product>>;
	isLoading: Record<number, boolean>;
	errors: Record<number, HelmError>;
}
