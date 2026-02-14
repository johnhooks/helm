import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import type { Product, Thunk, WithRestLinks } from '@helm/types';
import type { Action } from './types';
import type { store } from './index';

export const fetchProduct =
	( productId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'FETCH_PRODUCT_START', productId } );

		try {
			const product = await apiFetch< WithRestLinks< Product > >( {
				path: `/helm/v1/products/${ productId }`,
			} );

			dispatch( { type: 'FETCH_PRODUCT_FINISHED', productId, product } );
		} catch ( error ) {
			dispatch( {
				type: 'FETCH_PRODUCT_FAILED',
				productId,
				error: HelmError.safe( ErrorCode.ProductsInvalidResponse, __( 'Could not load product data.', 'helm' ), await HelmError.asyncFrom( error ) ),
			} );
		}
	};

export function receiveProduct( product: WithRestLinks< Product > ): Action {
	return { type: 'RECEIVE_PRODUCT', product };
}

export function receiveProducts( products: WithRestLinks< Product >[] ): Action {
	return { type: 'RECEIVE_PRODUCTS', products };
}
