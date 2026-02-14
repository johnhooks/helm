import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import { LinkRel } from '@helm/types';
import {
	fetchShip,
	receiveShip,
	fetchSystems,
	receiveSystems,
	editShip,
	patchShip,
	receiveShipEmbeds,
} from '../actions';
import { createShipState, createSystemComponent, createProductEmbed } from './fixtures';

vi.mock( '@wordpress/api-fetch' );

const mockedApiFetch = vi.mocked( apiFetch );

describe( 'fetchShip', () => {
	let dispatch: ReturnType< typeof vi.fn > & {
		fetchShip: ReturnType< typeof vi.fn >;
		receiveShipEmbeds: ReturnType< typeof vi.fn >;
	};

	beforeEach( () => {
		mockedApiFetch.mockReset();
		dispatch = Object.assign( vi.fn(), {
			fetchShip: vi.fn(),
			receiveShipEmbeds: vi.fn(),
		} );
	} );

	it( 'dispatches START then FINISHED on success', async () => {
		const ship = createShipState( { id: 42 } );
		mockedApiFetch.mockResolvedValue( ship );

		await fetchShip( 42 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SHIP_START',
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SHIP_FINISHED',
			ship,
		} );
	} );

	it( 'calls apiFetch with embed param', async () => {
		mockedApiFetch.mockResolvedValue( createShipState() );

		await fetchShip( 7 )( { dispatch } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/helm/v1/ships/7?_embed[]=helm:systems',
		} );
	} );

	it( 'strips _embedded but keeps _links on ship data', async () => {
		const ship = createShipState( { id: 42 } );
		const systems = [ createSystemComponent() ];
		const _links = { self: [ { href: 'http://example.com' } ] };
		mockedApiFetch.mockResolvedValue( {
			...ship,
			_embedded: { [ LinkRel.Systems ]: systems },
			_links,
		} );

		await fetchShip( 42 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SHIP_FINISHED',
			ship: { ...ship, _links },
		} );
	} );

	it( 'dispatches receiveShipEmbeds when _embedded is present', async () => {
		const embedded = { [ LinkRel.Systems ]: [ createSystemComponent() ] };
		mockedApiFetch.mockResolvedValue( {
			...createShipState( { id: 42 } ),
			_embedded: embedded,
		} );

		await fetchShip( 42 )( { dispatch } as never );

		expect( dispatch.receiveShipEmbeds ).toHaveBeenCalledWith(
			embedded
		);
	} );

	it( 'does not dispatch receiveShipEmbeds when no _embedded', async () => {
		mockedApiFetch.mockResolvedValue( createShipState( { id: 42 } ) );

		await fetchShip( 42 )( { dispatch } as never );

		expect( dispatch.receiveShipEmbeds ).not.toHaveBeenCalled();
	} );

	it( 'always wraps API error with store-level code', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.ship.not_found',
			message: 'Ship not found',
			data: { status: 404 },
		} );

		await fetchShip( 42 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SHIP_START',
		} );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_SHIP_FAILED'
		);
		expect( failedCall ).toBeDefined();

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ships.invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( HelmError.is( error.cause ) ).toBe( true );
		expect( ( error.cause as HelmError ).message ).toBe( 'helm.ship.not_found' );
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
		expect( HelmError.is( error.cause ) ).toBe( true );
		expect( ( error.cause as HelmError ).message ).toBe( 'helm.unknown_error' );
		expect( ( error.cause as HelmError ).detail ).toBe( 'Network failure' );
	} );

	it( 'extracts WP REST error from thrown Response and wraps it', async () => {
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
		expect( error.message ).toBe( 'helm.ships.invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( ( error.cause as HelmError ).message ).toBe( 'helm.ship.not_found' );
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
		expect( HelmError.is( error.cause ) ).toBe( true );
		expect( ( error.cause as HelmError ).detail ).toBe( 'HTTP 500 Internal Server Error' );
	} );
} );

describe( 'receiveShip', () => {
	it( 'returns a RECEIVE_SHIP action', () => {
		const ship = createShipState( { id: 5 } );
		const action = receiveShip( ship );

		expect( action ).toEqual( {
			type: 'RECEIVE_SHIP',
			ship,
		} );
	} );
} );

describe( 'fetchSystems', () => {
	let dispatch: ReturnType< typeof vi.fn > & {
		fetchSystems: ReturnType< typeof vi.fn >;
	};

	beforeEach( () => {
		mockedApiFetch.mockReset();
		dispatch = Object.assign( vi.fn(), {
			fetchSystems: vi.fn(),
		} );
	} );

	it( 'dispatches START then FINISHED on success', async () => {
		const systems = [ createSystemComponent() ];
		mockedApiFetch.mockResolvedValue( systems );

		await fetchSystems( 42 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SYSTEMS_START',
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SYSTEMS_FINISHED',
			systems,
		} );
	} );

	it( 'calls apiFetch with the correct path', async () => {
		mockedApiFetch.mockResolvedValue( [] );

		await fetchSystems( 7 )( { dispatch } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/helm/v1/ships/7/systems?_embed[]=helm:product',
		} );
	} );

	it( 'always wraps API error with store-level code', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.ship.not_found',
			message: 'Ship not found',
			data: { status: 404 },
		} );

		await fetchSystems( 42 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_SYSTEMS_FAILED'
		);
		expect( failedCall ).toBeDefined();

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ships.systems_invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( ( error.cause as HelmError ).message ).toBe( 'helm.ship.not_found' );
	} );

	it( 'wraps plain Error as systems invalid response', async () => {
		mockedApiFetch.mockRejectedValue( new Error( 'Network failure' ) );

		await fetchSystems( 1 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'FETCH_SYSTEMS_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ships.systems_invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( HelmError.is( error.cause ) ).toBe( true );
	} );
} );

describe( 'receiveSystems', () => {
	it( 'returns a RECEIVE_SYSTEMS action', () => {
		const systems = [ createSystemComponent() ];
		const action = receiveSystems( systems );

		expect( action ).toEqual( {
			type: 'RECEIVE_SYSTEMS',
			systems,
		} );
	} );
} );

describe( 'editShip', () => {
	it( 'returns an EDIT_SHIP action', () => {
		const edits = { power_mode: 'overdrive' };
		const action = editShip( edits );

		expect( action ).toEqual( {
			type: 'EDIT_SHIP',
			edits,
		} );
	} );
} );

describe( 'receiveShipEmbeds', () => {
	let dispatch: ReturnType< typeof vi.fn >;
	let registry: { dispatch: ReturnType< typeof vi.fn > };
	let productsDispatch: { receiveProducts: ReturnType< typeof vi.fn > };

	beforeEach( () => {
		dispatch = vi.fn();
		productsDispatch = { receiveProducts: vi.fn() };
		registry = {
			dispatch: vi.fn().mockReturnValue( productsDispatch ),
		};
	} );

	it( 'dispatches receiveSystems when helm:systems is present', () => {
		const systems = [ createSystemComponent() ];

		receiveShipEmbeds( { [ LinkRel.Systems ]: systems } )( {
			dispatch,
			registry,
		} as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'RECEIVE_SYSTEMS',
			systems,
		} );
	} );

	it( 'dispatches product embeds to the products store', () => {
		const product = createProductEmbed( { id: 10 } );
		const systems = [
			{
				...createSystemComponent( { product_id: 10 } ),
				_embedded: { [ LinkRel.Product ]: [ product ] as [ typeof product ] },
			},
		];

		receiveShipEmbeds( { [ LinkRel.Systems ]: systems } )( {
			dispatch,
			registry,
		} as never );

		expect( registry.dispatch ).toHaveBeenCalledWith( productsStore );
		expect( productsDispatch.receiveProducts ).toHaveBeenCalledWith( [ product ] );
	} );

	it( 'skips products dispatch when no product embeds', () => {
		const systems = [ createSystemComponent() ];

		receiveShipEmbeds( { [ LinkRel.Systems ]: systems } )( {
			dispatch,
			registry,
		} as never );

		expect( registry.dispatch ).not.toHaveBeenCalled();
	} );

	it( 'does not dispatch when helm:systems is absent', () => {
		receiveShipEmbeds( {} )( { dispatch, registry } as never );

		expect( dispatch ).not.toHaveBeenCalled();
		expect( registry.dispatch ).not.toHaveBeenCalled();
	} );
} );

describe( 'patchShip', () => {
	let dispatch: ReturnType< typeof vi.fn >;

	beforeEach( () => {
		mockedApiFetch.mockReset();
		dispatch = vi.fn();
	} );

	it( 'dispatches PATCH_SHIP_START with edits, then FINISHED on success', async () => {
		const ship = createShipState( { id: 42, power_mode: 'overdrive' } );
		mockedApiFetch.mockResolvedValue( ship );

		await patchShip( 42, { power_mode: 'overdrive' } )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'PATCH_SHIP_START',
			edits: { power_mode: 'overdrive' },
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'PATCH_SHIP_FINISHED',
			ship,
		} );
	} );

	it( 'returns null on success', async () => {
		mockedApiFetch.mockResolvedValue( createShipState() );

		const result = await patchShip( 1, { power_mode: 'normal' } )( { dispatch } as never );

		expect( result ).toBeNull();
	} );

	it( 'calls apiFetch with PATCH method and edits body', async () => {
		mockedApiFetch.mockResolvedValue( createShipState() );

		await patchShip( 7, { power_mode: 'efficiency' } )( { dispatch } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/helm/v1/ships/7',
			method: 'PATCH',
			data: { power_mode: 'efficiency' },
		} );
	} );

	it( 'always wraps API error with store-level code', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.ship.invalid_power_mode',
			message: 'Invalid power mode',
			data: { status: 422 },
		} );

		await patchShip( 42, { power_mode: 'bad' } )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'PATCH_SHIP_FAILED'
		);
		expect( failedCall ).toBeDefined();

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ships.patch_failed' );
		expect( error.isSafe ).toBe( true );
		expect( ( error.cause as HelmError ).message ).toBe( 'helm.ship.invalid_power_mode' );
	} );

	it( 'returns the HelmError on failure', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.ship.invalid_power_mode',
			message: 'Invalid power mode',
			data: { status: 422 },
		} );

		const result = await patchShip( 42, { power_mode: 'bad' } )( { dispatch } as never );

		expect( result ).toBeInstanceOf( HelmError );
		expect( result?.message ).toBe( 'helm.ships.patch_failed' );
	} );

	it( 'wraps plain Error as patch failed with cause', async () => {
		mockedApiFetch.mockRejectedValue( new Error( 'Network failure' ) );

		await patchShip( 1, { power_mode: 'normal' } )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ action ] ) => action.type === 'PATCH_SHIP_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.ships.patch_failed' );
		expect( error.isSafe ).toBe( true );
		expect( HelmError.is( error.cause ) ).toBe( true );
	} );
} );
