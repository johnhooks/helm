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
			shipId: 42,
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SHIP_FINISHED',
			shipId: 42,
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
			shipId: 42,
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
			42,
			embedded
		);
	} );

	it( 'does not dispatch receiveShipEmbeds when no _embedded', async () => {
		mockedApiFetch.mockResolvedValue( createShipState( { id: 42 } ) );

		await fetchShip( 42 )( { dispatch } as never );

		expect( dispatch.receiveShipEmbeds ).not.toHaveBeenCalled();
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
			shipId: 42,
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SYSTEMS_FINISHED',
			shipId: 42,
			systems,
		} );
	} );

	it( 'calls apiFetch with the correct path', async () => {
		mockedApiFetch.mockResolvedValue( [] );

		await fetchSystems( 7 )( { dispatch } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/helm/v1/ships/7/systems',
		} );
	} );

	it( 'dispatches FAILED with HelmError on API error', async () => {
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
		expect( error.message ).toBe( 'helm.ship.not_found' );
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
	} );
} );

describe( 'receiveSystems', () => {
	it( 'returns a FETCH_SYSTEMS_FINISHED action', () => {
		const systems = [ createSystemComponent() ];
		const action = receiveSystems( 42, systems );

		expect( action ).toEqual( {
			type: 'FETCH_SYSTEMS_FINISHED',
			shipId: 42,
			systems,
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

		receiveShipEmbeds( 42, { [ LinkRel.Systems ]: systems } )( {
			dispatch,
			registry,
		} as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_SYSTEMS_FINISHED',
			shipId: 42,
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

		receiveShipEmbeds( 42, { [ LinkRel.Systems ]: systems } )( {
			dispatch,
			registry,
		} as never );

		expect( registry.dispatch ).toHaveBeenCalledWith( productsStore );
		expect( productsDispatch.receiveProducts ).toHaveBeenCalledWith( [ product ] );
	} );

	it( 'skips products dispatch when no product embeds', () => {
		const systems = [ createSystemComponent() ];

		receiveShipEmbeds( 42, { [ LinkRel.Systems ]: systems } )( {
			dispatch,
			registry,
		} as never );

		expect( registry.dispatch ).not.toHaveBeenCalled();
	} );

	it( 'does not dispatch when helm:systems is absent', () => {
		receiveShipEmbeds( 42, {} )( { dispatch, registry } as never );

		expect( dispatch ).not.toHaveBeenCalled();
		expect( registry.dispatch ).not.toHaveBeenCalled();
	} );
} );
