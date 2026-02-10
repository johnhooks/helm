import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { HelmError } from '@helm/errors';
import { fetchShip, receiveShip } from '../actions';
import { createShipState } from './fixtures';

vi.mock( '@wordpress/api-fetch' );

const mockedApiFetch = vi.mocked( apiFetch );

describe( 'fetchShip', () => {
	let dispatch: ReturnType< typeof vi.fn > & { fetchShip: ReturnType< typeof vi.fn > };

	beforeEach( () => {
		mockedApiFetch.mockReset();
		dispatch = Object.assign( vi.fn(), {
			fetchShip: vi.fn(),
		} );
	} );

	it( 'dispatches START then FINISHED on success', async () => {
		const ship = createShipState( { id: 42 } );
		mockedApiFetch.mockResolvedValue( ship );

		await fetchShip( 42 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SHIP_START',
			shipId: 42,
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SHIP_FINISHED',
			shipId: 42,
			ship,
		} );
	} );

	it( 'calls apiFetch with the correct path', async () => {
		mockedApiFetch.mockResolvedValue( createShipState() );

		await fetchShip( 7 )( { dispatch } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/helm/v1/ships/7',
		} );
	} );

	it( 'dispatches FAILED with HelmError on API error', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.ship.not_found',
			message: 'Ship not found',
			data: { status: 404 },
		} );

		await fetchShip( 42 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SHIP_START',
			shipId: 42,
		} );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_SHIP_FAILED'
		);
		expect( failedCall ).toBeDefined();

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ship.not_found' );
	} );

	it( 'wraps plain Error as invalid response with cause', async () => {
		mockedApiFetch.mockRejectedValue( new Error( 'Network failure' ) );

		await fetchShip( 1 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_SHIP_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ships.invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].message ).toBe( 'helm.unknown_error' );
		expect( error.causes[ 0 ].detail ).toBe( 'Network failure' );
	} );

	it( 'extracts WP REST error from thrown Response', async () => {
		const body = {
			code: 'helm.ship.not_found',
			message: 'Ship not found',
			data: { status: 404 },
		};
		mockedApiFetch.mockRejectedValue(
			new Response( JSON.stringify( body ), { status: 404 } )
		);

		await fetchShip( 42 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_SHIP_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ship.not_found' );
		expect( error.isSafe ).toBe( true );
	} );

	it( 'wraps non-WP-REST Response as invalid response', async () => {
		mockedApiFetch.mockRejectedValue(
			new Response( '<html>Error</html>', { status: 500, statusText: 'Internal Server Error' } )
		);

		await fetchShip( 42 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_SHIP_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ships.invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].detail ).toBe( 'HTTP 500 Internal Server Error' );
	} );
} );

describe( 'receiveShip', () => {
	it( 'returns a FETCH_SHIP_FINISHED action', () => {
		const ship = createShipState( { id: 5 } );
		const action = receiveShip( 5, ship );

		expect( action ).toEqual( {
			type: 'FETCH_SHIP_FINISHED',
			shipId: 5,
			ship,
		} );
	} );
} );
