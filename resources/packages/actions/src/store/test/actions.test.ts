import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { HelmError } from '@helm/errors';
import { createAction, loadMore, receiveAction, receiveHeartbeat, draftCreate, clearDraft, submitDraft } from '../actions';
import { createShipAction } from './fixtures';

vi.mock( '@wordpress/api-fetch' );
vi.mock( '@helm/nav', () => ( {
	store: { name: 'helm/nav' },
} ) );
vi.mock( '@helm/ships', () => ( {
	store: { name: 'helm/ships' },
} ) );

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

		expect( dispatch ).toHaveBeenCalledTimes( 2 );
		expect( dispatch ).toHaveBeenNthCalledWith( 1, { type: 'CREATE_ACTION_START' } );
		expect( dispatch ).toHaveBeenNthCalledWith( 2, { type: 'CREATE_ACTION_FINISHED', action } );
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

		expect( dispatch ).toHaveBeenCalledTimes( 2 );

		const error = dispatch.mock.calls[ 1 ][ 0 ].error;
		expect( dispatch.mock.calls[ 1 ][ 0 ].type ).toBe( 'CREATE_ACTION_FAILED' );
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.create_failed' );
		expect( error.isSafe ).toBe( true );
		expect( HelmError.is( error.cause ) ).toBe( true );
		expect( ( error.cause as HelmError ).message ).toBe( 'helm.actions.create_failed' );
	} );

	it( 'wraps plain Error as create_failed with cause', async () => {
		mockedApiFetch.mockRejectedValue( new Error( 'Network failure' ) );

		await createAction( 1, 'scan_route' )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledTimes( 2 );

		const error = dispatch.mock.calls[ 1 ][ 0 ].error;
		expect( dispatch.mock.calls[ 1 ][ 0 ].type ).toBe( 'CREATE_ACTION_FAILED' );
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.create_failed' );
		expect( error.isSafe ).toBe( true );
		expect( HelmError.is( error.cause ) ).toBe( true );
		expect( ( error.cause as HelmError ).detail ).toBe( 'Network failure' );
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

		expect( dispatch ).toHaveBeenCalledTimes( 2 );

		const error = dispatch.mock.calls[ 1 ][ 0 ].error;
		expect( dispatch.mock.calls[ 1 ][ 0 ].type ).toBe( 'CREATE_ACTION_FAILED' );
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.create_failed' );
		expect( error.isSafe ).toBe( true );
		expect( HelmError.is( error.cause ) ).toBe( true );
		expect( ( error.cause as HelmError ).message ).toBe( 'helm.actions.create_failed' );
	} );

	it( 'wraps non-WP-REST Response as create_failed', async () => {
		mockedApiFetch.mockRejectedValue(
			new Response( '<html>Error</html>', { status: 500, statusText: 'Internal Server Error' } )
		);

		await createAction( 1, 'scan_route' )( { dispatch } as never );

		expect( dispatch ).toHaveBeenCalledTimes( 2 );

		const error = dispatch.mock.calls[ 1 ][ 0 ].error;
		expect( dispatch.mock.calls[ 1 ][ 0 ].type ).toBe( 'CREATE_ACTION_FAILED' );
		expect( error ).toBeInstanceOf( HelmError );
		expect( error.message ).toBe( 'helm.actions.create_failed' );
		expect( error.isSafe ).toBe( true );
		expect( HelmError.is( error.cause ) ).toBe( true );
		expect( ( error.cause as HelmError ).detail ).toBe( 'HTTP 500 Internal Server Error' );
	} );
} );

describe( 'receiveAction', () => {
	it( 'returns a RECEIVE_ACTION action', () => {
		const action = createShipAction( { ship_post_id: 5 } );
		const result = receiveAction( action );

		expect( result ).toEqual( {
			type: 'RECEIVE_ACTION',
			action,
		} );
	} );
} );

describe( 'receiveHeartbeat', () => {
	let dispatch: ReturnType< typeof vi.fn >;
	let invalidateResolution: ReturnType< typeof vi.fn >;
	let syncUserEdgesIfStale: ReturnType< typeof vi.fn >;
	let syncUserEdgesByIds: ReturnType< typeof vi.fn >;
	let registry: { dispatch: ReturnType< typeof vi.fn > };

	beforeEach( () => {
		dispatch = vi.fn();
		invalidateResolution = vi.fn();
		syncUserEdgesIfStale = vi.fn().mockResolvedValue( undefined );
		syncUserEdgesByIds = vi.fn().mockResolvedValue( undefined );
		registry = {
			dispatch: vi.fn( ( store ) => store.name === 'helm/nav'
				? { syncUserEdgesIfStale, syncUserEdgesByIds }
				: { invalidateResolution } ),
		};
	} );

	it( 'dispatches a RECEIVE_HEARTBEAT action', async () => {
		const actions = [
			createShipAction( { id: 1, ship_post_id: 1 } ),
			createShipAction( { id: 2, ship_post_id: 2 } ),
		];

		await receiveHeartbeat( actions, '2025-06-01T00:00:00Z' )(
			{ dispatch, registry } as never,
		);

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'RECEIVE_HEARTBEAT',
			actions,
			cursor: '2025-06-01T00:00:00Z',
		} );
	} );

	it( 'dispatches a RECEIVE_HEARTBEAT action for empty array', async () => {
		await receiveHeartbeat( [], '2025-06-01T00:00:00Z' )(
			{ dispatch, registry } as never,
		);

		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'RECEIVE_HEARTBEAT',
			actions: [],
			cursor: '2025-06-01T00:00:00Z',
		} );
	} );

	it( 'invalidates the ship resolver for each fulfilled jump', async () => {
		const actions = [
			createShipAction( { id: 10, ship_post_id: 1, type: 'jump', status: 'fulfilled' } ),
			createShipAction( { id: 11, ship_post_id: 2, type: 'jump', status: 'fulfilled' } ),
		];

		await receiveHeartbeat( actions, '2025-06-01T00:00:00Z' )(
			{ dispatch, registry } as never,
		);

		expect( invalidateResolution ).toHaveBeenCalledWith( 'getShip', [ 1 ] );
		expect( invalidateResolution ).toHaveBeenCalledWith( 'getShip', [ 2 ] );
	} );

	it( 'invalidates once per ship when multiple fulfilled jumps land together', async () => {
		const actions = [
			createShipAction( { id: 10, ship_post_id: 1, type: 'jump', status: 'fulfilled' } ),
			createShipAction( { id: 11, ship_post_id: 1, type: 'jump', status: 'fulfilled' } ),
		];

		await receiveHeartbeat( actions, '2025-06-01T00:00:00Z' )(
			{ dispatch, registry } as never,
		);

		expect( invalidateResolution ).toHaveBeenCalledTimes( 1 );
		expect( invalidateResolution ).toHaveBeenCalledWith( 'getShip', [ 1 ] );
	} );

	it( 'does not invalidate for non-jump or non-fulfilled actions', async () => {
		const actions = [
			createShipAction( { id: 10, ship_post_id: 1, type: 'jump', status: 'running' } ),
			createShipAction( { id: 11, ship_post_id: 1, type: 'scan_route', status: 'fulfilled' } ),
		];

		await receiveHeartbeat( actions, '2025-06-01T00:00:00Z' )(
			{ dispatch, registry } as never,
		);

		expect( invalidateResolution ).not.toHaveBeenCalled();
	} );

	it( 'syncs discovered scan edges once when heartbeat receives scan discoveries', async () => {
		const actions = [
			createShipAction( {
				id: 11,
				ship_post_id: 1,
				type: 'scan_route',
				status: 'fulfilled',
				result: {
					from_node_id: 1,
					to_node_id: 3,
					skill: 1,
					efficiency: 1,
					duration: 3600,
					success: true,
					complete: true,
					nodes: [ { id: 2, type: 'waypoint', x: 1, y: 1, z: 1 } ],
					edges: [ { id: 7, node_a_id: 1, node_b_id: 2 } ],
					discovered_edge_ids: [ 7 ],
					discovered_node_ids: [ 2 ],
					edges_discovered: 1,
					waypoints_created: 1,
					path: [ 1, 2, 3 ],
				},
			} ),
			createShipAction( {
				id: 12,
				ship_post_id: 1,
				type: 'scan_route',
				status: 'partial',
				result: {
					from_node_id: 1,
					to_node_id: 4,
					skill: 1,
					efficiency: 1,
					duration: 3600,
					success: true,
					complete: false,
					nodes: [ { id: 3, type: 'waypoint', x: 2, y: 2, z: 2 } ],
					edges: [ { id: 8, node_a_id: 2, node_b_id: 3 } ],
					discovered_edge_ids: [ 8 ],
					discovered_node_ids: [ 3 ],
					edges_discovered: 1,
					waypoints_created: 1,
					path: [ 1, 2, 3 ],
				},
			} ),
		];

		await receiveHeartbeat( actions, '2025-06-01T00:00:00Z' )(
			{ dispatch, registry } as never,
		);

		expect( syncUserEdgesByIds ).toHaveBeenCalledTimes( 1 );
		expect( syncUserEdgesByIds ).toHaveBeenCalledWith( [ 7, 8 ] );
	} );

	it( 'does not sync scan edges when terminal scan has no discovered ids', async () => {
		const actions = [
			createShipAction( {
				id: 11,
				ship_post_id: 1,
				type: 'scan_route',
				status: 'fulfilled',
				result: {
					from_node_id: 1,
					to_node_id: 3,
					skill: 1,
					efficiency: 1,
					duration: 3600,
					success: false,
					complete: false,
					nodes: [],
					edges: [],
					discovered_edge_ids: [],
					discovered_node_ids: [],
					edges_discovered: 0,
					waypoints_created: 0,
					path: [],
				},
			} ),
		];

		await receiveHeartbeat( actions, '2025-06-01T00:00:00Z' )(
			{ dispatch, registry } as never,
		);

		expect( syncUserEdgesByIds ).not.toHaveBeenCalled();
	} );
} );

describe( 'draftCreate', () => {
	it( 'returns a CREATE_DRAFT action', () => {
		const action = { type: 'scan_route' as const, params: { target_node_id: 5 } };
		const result = draftCreate( action );

		expect( result ).toEqual( { type: 'CREATE_DRAFT', action } );
	} );
} );

describe( 'clearDraft', () => {
	it( 'returns a CLEAR_DRAFT action', () => {
		expect( clearDraft() ).toEqual( { type: 'CLEAR_DRAFT' } );
	} );
} );

describe( 'submitDraft', () => {
	let dispatch: ReturnType< typeof vi.fn > & { createAction: ReturnType< typeof vi.fn > };
	let select: Record< string, ReturnType< typeof vi.fn > >;

	beforeEach( () => {
		dispatch = Object.assign( vi.fn(), {
			createAction: vi.fn(),
		} );
		select = {
			getDraft: vi.fn().mockReturnValue( null ),
		};
	} );

	it( 'calls createAction with draft type and params', async () => {
		select.getDraft.mockReturnValue( { type: 'scan_route', params: { depth: 3 } } );

		await submitDraft( 7 )( { dispatch, select } as never );

		expect( dispatch.createAction ).toHaveBeenCalledWith( 7, 'scan_route', { depth: 3 } );
	} );

	it( 'throws when no draft', async () => {
		select.getDraft.mockReturnValue( null );

		await expect( submitDraft( 7 )( { dispatch, select } as never ) )
			.rejects.toThrow( HelmError );
	} );
} );

describe( 'loadMore', () => {
	let dispatch: ReturnType< typeof vi.fn >;
	let select: Record< string, ReturnType< typeof vi.fn > >;

	beforeEach( () => {
		mockedApiFetch.mockReset();
		dispatch = vi.fn();
		select = {
			getQueryMeta: vi.fn().mockReturnValue( null ),
		};
	} );

	it( 'fetches the next URL from meta', async () => {
		select.getQueryMeta.mockReturnValue( {
			next: 'http://example.com/page2',
			isLoading: false,
			error: null,
		} );

		const response = new Response( JSON.stringify( [] ), {
			headers: {},
		} );
		mockedApiFetch.mockResolvedValue( response );

		await loadMore( 1 )( { dispatch, select } as never );

		expect( mockedApiFetch ).toHaveBeenCalledWith(
			expect.objectContaining( { url: 'http://example.com/page2', parse: false } )
		);
	} );

	it( 'dispatches START then FINISHED on success', async () => {
		select.getQueryMeta.mockReturnValue( {
			next: 'http://example.com/page2',
			isLoading: false,
			error: null,
		} );

		const actions = [ createShipAction( { id: 5 } ) ];
		const response = new Response( JSON.stringify( actions ), {
			headers: { Link: '<http://example.com/page3>; rel="next"' },
		} );
		mockedApiFetch.mockResolvedValue( response );

		await loadMore( 1 )( { dispatch, select } as never );

		expect( dispatch ).toHaveBeenCalledTimes( 2 );
		expect( dispatch ).toHaveBeenNthCalledWith( 1, { type: 'LOAD_MORE_START', queryId: '/helm/v1/ships/1/actions' } );
		expect( dispatch ).toHaveBeenNthCalledWith( 2, {
			type: 'LOAD_MORE_FINISHED',
			queryId: '/helm/v1/ships/1/actions',
			actions,
			next: 'http://example.com/page3',
		} );
	} );

	it( 'dispatches FAILED on error', async () => {
		select.getQueryMeta.mockReturnValue( {
			next: 'http://example.com/page2',
			isLoading: false,
			error: null,
		} );
		mockedApiFetch.mockRejectedValue( new Error( 'Network failure' ) );

		await loadMore( 1 )( { dispatch, select } as never );

		expect( dispatch ).toHaveBeenCalledTimes( 2 );
		expect( dispatch ).toHaveBeenNthCalledWith( 1, { type: 'LOAD_MORE_START', queryId: '/helm/v1/ships/1/actions' } );
		expect( dispatch.mock.calls[ 1 ][ 0 ].type ).toBe( 'LOAD_MORE_FAILED' );
		expect( dispatch.mock.calls[ 1 ][ 0 ].error ).toBeInstanceOf( HelmError );
	} );

	it( 'skips when no next URL', async () => {
		select.getQueryMeta.mockReturnValue( {
			next: null,
			isLoading: false,
			error: null,
		} );

		await loadMore( 1 )( { dispatch, select } as never );

		expect( dispatch ).not.toHaveBeenCalled();
		expect( mockedApiFetch ).not.toHaveBeenCalled();
	} );

	it( 'skips when already loading', async () => {
		select.getQueryMeta.mockReturnValue( {
			next: 'http://example.com/page2',
			isLoading: true,
			error: null,
		} );

		await loadMore( 1 )( { dispatch, select } as never );

		expect( dispatch ).not.toHaveBeenCalled();
		expect( mockedApiFetch ).not.toHaveBeenCalled();
	} );

	it( 'skips when no meta exists', async () => {
		select.getQueryMeta.mockReturnValue( null );

		await loadMore( 1 )( { dispatch, select } as never );

		expect( dispatch ).not.toHaveBeenCalled();
		expect( mockedApiFetch ).not.toHaveBeenCalled();
	} );
} );
