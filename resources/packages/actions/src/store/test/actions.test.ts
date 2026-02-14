import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { HelmError } from '@helm/errors';
import { createAction, fetchCurrentAction, receiveAction, receiveHeartbeat, clearAction, draftCreate, clearDraft } from '../actions';
import { createShipAction } from './fixtures';

vi.mock( '@wordpress/api-fetch' );

const mockedApiFetch = vi.mocked( apiFetch );

describe( 'createAction', () => {
	let dispatch: ReturnType< typeof vi.fn >;

	beforeEach( () => {
		mockedApiFetch.mockReset();
		dispatch = vi.fn();
	} );

	it( 'dispatches START then FINISHED on success', async () => {
		const action = createShipAction( { id: 42 } );
		mockedApiFetch.mockResolvedValue( action );

		await createAction( 1, 'scan_route' )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'CREATE_ACTION_START',
			shipId: 1,
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'CREATE_ACTION_FINISHED',
			shipId: 1,
			action,
		} );
	} );

	it( 'calls apiFetch with the correct path and data', async () => {
		mockedApiFetch.mockResolvedValue( createShipAction() );

		await createAction( 7, 'scan_route', { depth: 3 } )( { dispatch } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/helm/v1/ships/7/actions',
			method: 'POST',
			data: { type: 'scan_route', params: { depth: 3 } },
		} );
	} );

	it( 'wraps safe API error as cause', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.actions.create_failed',
			message: 'Could not create action',
			data: { status: 400 },
		} );

		await createAction( 1, 'scan_route' )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ a ] ) => a.type === 'CREATE_ACTION_FAILED'
		);
		expect( failedCall ).toBeDefined();

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.create_failed' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].message ).toBe( 'helm.actions.create_failed' );
	} );

	it( 'wraps plain Error as create_failed with cause', async () => {
		mockedApiFetch.mockRejectedValue( new Error( 'Network failure' ) );

		await createAction( 1, 'scan_route' )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ a ] ) => a.type === 'CREATE_ACTION_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.create_failed' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].detail ).toBe( 'Network failure' );
	} );

	it( 'extracts WP REST error from thrown Response as cause', async () => {
		const body = {
			code: 'helm.actions.create_failed',
			message: 'Could not create action',
			data: { status: 400 },
		};
		mockedApiFetch.mockRejectedValue(
			new Response( JSON.stringify( body ), { status: 400 } )
		);

		await createAction( 1, 'scan_route' )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ a ] ) => a.type === 'CREATE_ACTION_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.create_failed' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].message ).toBe( 'helm.actions.create_failed' );
	} );

	it( 'wraps non-WP-REST Response as create_failed', async () => {
		mockedApiFetch.mockRejectedValue(
			new Response( '<html>Error</html>', { status: 500, statusText: 'Internal Server Error' } )
		);

		await createAction( 1, 'scan_route' )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ a ] ) => a.type === 'CREATE_ACTION_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.create_failed' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].detail ).toBe( 'HTTP 500 Internal Server Error' );
	} );
} );

describe( 'fetchCurrentAction', () => {
	let dispatch: ReturnType< typeof vi.fn >;

	beforeEach( () => {
		mockedApiFetch.mockReset();
		dispatch = vi.fn();
	} );

	it( 'dispatches START then FINISHED on success', async () => {
		const action = createShipAction();
		mockedApiFetch.mockResolvedValue( action );

		await fetchCurrentAction( 1 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_ACTION_START',
			shipId: 1,
		} );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_ACTION_FINISHED',
			shipId: 1,
			action,
		} );
	} );

	it( 'calls apiFetch with the correct path', async () => {
		mockedApiFetch.mockResolvedValue( createShipAction() );

		await fetchCurrentAction( 7 )( { dispatch } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith( {
			path: '/helm/v1/ships/7/actions/current',
		} );
	} );

	it( 'dispatches FINISHED with null for helm.action.none', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.action.none',
			message: 'helm.action.none',
			data: { status: 404 },
		} );

		await fetchCurrentAction( 1 )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'FETCH_ACTION_FINISHED',
			shipId: 1,
			action: null,
		} );
	} );

	it( 'wraps safe API error as cause', async () => {
		mockedApiFetch.mockRejectedValue( {
			code: 'helm.server_error',
			message: 'Server error',
			data: { status: 500 },
		} );

		await fetchCurrentAction( 1 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ a ] ) => a.type === 'FETCH_ACTION_FAILED'
		);
		expect( failedCall ).toBeDefined();

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
		expect( error.causes[ 0 ].message ).toBe( 'helm.server_error' );
	} );

	it( 'wraps plain Error as invalid_response with cause', async () => {
		mockedApiFetch.mockRejectedValue( new Error( 'Network failure' ) );

		await fetchCurrentAction( 1 )( { dispatch } as never );

		const failedCall = dispatch.mock.calls.find(
			( [ a ] ) => a.type === 'FETCH_ACTION_FAILED'
		);

		const error = failedCall![ 0 ].error;
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.invalid_response' );
		expect( error.isSafe ).toBe( true );
		expect( error.causes ).toHaveLength( 1 );
	} );
} );

describe( 'receiveAction', () => {
	it( 'returns a RECEIVE_ACTION action', () => {
		const action = createShipAction( { ship_post_id: 5 } );
		const result = receiveAction( 5, action );

		expect( result ).toEqual( {
			type: 'RECEIVE_ACTION',
			shipId: 5,
			action,
		} );
	} );
} );

describe( 'receiveHeartbeat', () => {
	it( 'returns a RECEIVE_HEARTBEAT action', () => {
		const actions = [
			createShipAction( { id: 1, ship_post_id: 1 } ),
			createShipAction( { id: 2, ship_post_id: 2 } ),
		];

		const result = receiveHeartbeat( actions, '2025-06-01T00:00:00Z' );

		expect( result ).toEqual( {
			type: 'RECEIVE_HEARTBEAT',
			actions,
			cursor: '2025-06-01T00:00:00Z',
		} );
	} );

	it( 'returns a RECEIVE_HEARTBEAT action for empty array', () => {
		const result = receiveHeartbeat( [], '2025-06-01T00:00:00Z' );

		expect( result ).toEqual( {
			type: 'RECEIVE_HEARTBEAT',
			actions: [],
			cursor: '2025-06-01T00:00:00Z',
		} );
	} );
} );

describe( 'clearAction', () => {
	it( 'returns a CLEAR_ACTION action', () => {
		const result = clearAction( 5 );

		expect( result ).toEqual( {
			type: 'CLEAR_ACTION',
			shipId: 5,
		} );
	} );
} );

describe( 'draftCreate', () => {
	it( 'returns a CREATE_DRAFT action', () => {
		const action = { type: 'scan_route', params: { target_node_id: 5 } };
		const result = draftCreate( action );

		expect( result ).toEqual( { type: 'CREATE_DRAFT', action } );
	} );
} );

describe( 'clearDraft', () => {
	it( 'returns a CLEAR_DRAFT action', () => {
		expect( clearDraft() ).toEqual( { type: 'CLEAR_DRAFT' } );
	} );
} );
