import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { HelmError } from '@helm/errors';
import { fetchProduct, receiveProduct, receiveProducts } from '../actions';
import { createProduct } from './fixtures';

vi.mock( '@wordpress/api-fetch' );

const mockedApiFetch = vi.mocked( apiFetch );

describe( 'fetchProduct', () => {
	let dispatch: ReturnType< typeof vi.fn > & {
		fetchProduct: ReturnType< typeof vi.fn >;
	};

	beforeEach( () => {
		mockedApiFetch.mockReset();
		dispatch = Object.assign( vi.fn(), {
			fetchProduct: vi.fn(),
		} );
	} );

	it( 'dispatches START then FINISHED on success', async () => {
		const product = createProduct( { id: 42 } );
		mockedApiFetch.mockResolvedValue( product );

		await fetchProduct( 42 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_PRODUCT_START',
			productId: 42,
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_PRODUCT_FINISHED',
			productId: 42,
			product,
		} );
	} );

	it( 'calls apiFetch with the correct path', async () => {
		mockedApiFetch.mockResolvedValue( createProduct() );

		await fetchProduct( 7 )( { dispatch } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/helm/v1/products/7',
		} );
	} );

	it( 'dispatches FAILED with HelmError on API error', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.product.not_found',
			message: 'Product not found',
			data: { status: 404 },
		} );

		await fetchProduct( 42 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_PRODUCT_START',
			productId: 42,
		} );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_PRODUCT_FAILED'
		);
		expect( failedCall ).toBeDefined();

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.product.not_found' );
	} );

	it( 'wraps plain Error as invalid response with cause', async () => {
		mockedApiFetch.mockRejectedValue( new Error( 'Network failure' ) );

		await fetchProduct( 1 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_PRODUCT_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.products.invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].message ).toBe( 'helm.unknown_error' );
		expect( error.causes[ 0 ].detail ).toBe( 'Network failure' );
	} );

	it( 'extracts WP REST error from thrown Response', async () => {
		const body = {
			code: 'helm.product.not_found',
			message: 'Product not found',
			data: { status: 404 },
		};
		mockedApiFetch.mockRejectedValue(
			new Response( JSON.stringify( body ), { status: 404 } )
		);

		await fetchProduct( 42 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_PRODUCT_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.product.not_found' );
		expect( error.isSafe ).toBe( true );
	} );

	it( 'wraps non-WP-REST Response as invalid response', async () => {
		mockedApiFetch.mockRejectedValue(
			new Response( '<html>Error</html>', { status: 500, statusText: 'Internal Server Error' } )
		);

		await fetchProduct( 42 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_PRODUCT_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.products.invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].detail ).toBe( 'HTTP 500 Internal Server Error' );
	} );
} );

describe( 'receiveProduct', () => {
	it( 'returns a RECEIVE_PRODUCT action', () => {
		const product = createProduct( { id: 5 } );
		const action = receiveProduct( product );

		expect( action ).toEqual( {
			type: 'RECEIVE_PRODUCT',
			product,
		} );
	} );
} );

describe( 'receiveProducts', () => {
	it( 'returns a RECEIVE_PRODUCTS action', () => {
		const products = [
			createProduct( { id: 1 } ),
			createProduct( { id: 2 } ),
		];

		const action = receiveProducts( products );

		expect( action ).toEqual( {
			type: 'RECEIVE_PRODUCTS',
			products,
		} );
	} );

	it( 'returns a RECEIVE_PRODUCTS action for empty array', () => {
		const action = receiveProducts( [] );

		expect( action ).toEqual( {
			type: 'RECEIVE_PRODUCTS',
			products: [],
		} );
	} );
} );
