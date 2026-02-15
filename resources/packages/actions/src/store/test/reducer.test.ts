import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { reducer, initializeDefaultState } from '../reducer';
import { createShipAction, createState } from './fixtures';

function reduce( state = initializeDefaultState(), action: Parameters< typeof reducer >[ 1 ] ) {
	return reducer( state, action );
}

describe( 'reducer', () => {
	describe( 'initializeDefaultState', () => {
		it( 'returns empty nested state', () => {
			expect( initializeDefaultState() ).toEqual( {
				actions: {
					byId: {},
					queries: {},
					meta: {},
					isLoading: {},
					error: {},
				},
				create: {
					action: null,
					isDraft: false,
					isSubmitting: false,
					error: null,
				},
				heartbeat: {
					cursor: null,
				},
			} );
		} );
	} );

	describe( 'CREATE_DRAFT', () => {
		it( 'sets the draft action with isDraft flag', () => {
			const draft = { type: 'scan_route' as const, params: { target_node_id: 5 } };
			const state = reduce( undefined, { type: 'CREATE_DRAFT', action: draft } );

			expect( state.create.action ).toEqual( draft );
			expect( state.create.isDraft ).toBe( true );
			expect( state.create.isSubmitting ).toBe( false );
			expect( state.create.error ).toBeNull();
		} );

		it( 'resets error from a previous failed create', () => {
			const prev = createState( {
				create: {
					action: { type: 'scan_route' as const, params: {} },
					isDraft: true,
					isSubmitting: false,
					error: new HelmError( 'helm.test', 'Error' ),
				},
			} );

			const draft = { type: 'scan_route' as const, params: { target_node_id: 10 } };
			const state = reduce( prev, { type: 'CREATE_DRAFT', action: draft } );

			expect( state.create.action ).toEqual( draft );
			expect( state.create.isDraft ).toBe( true );
			expect( state.create.error ).toBeNull();
		} );
	} );

	describe( 'CLEAR_DRAFT', () => {
		it( 'resets the entire create slice', () => {
			const prev = createState( {
				create: {
					action: { type: 'scan_route' as const, params: {} },
					isDraft: true,
					isSubmitting: false,
					error: new HelmError( 'helm.test', 'Error' ),
				},
			} );

			const state = reduce( prev, { type: 'CLEAR_DRAFT' } );

			expect( state.create.action ).toBeNull();
			expect( state.create.isDraft ).toBe( false );
			expect( state.create.isSubmitting ).toBe( false );
			expect( state.create.error ).toBeNull();
		} );
	} );

	describe( 'CREATE_ACTION_START', () => {
		it( 'sets isSubmitting and clears error', () => {
			const prev = createState( {
				create: {
					action: { type: 'scan_route' as const, params: {} },
					isDraft: true,
					isSubmitting: false,
					error: new HelmError( 'helm.test', 'Error' ),
				},
			} );

			const state = reduce( prev, { type: 'CREATE_ACTION_START' } );

			expect( state.create.isSubmitting ).toBe( true );
			expect( state.create.error ).toBeNull();
			expect( state.create.action ).toEqual( { type: 'scan_route', params: {} } );
			expect( state.create.isDraft ).toBe( true );
		} );

		it( 'does not affect actions state', () => {
			const action = createShipAction( { id: 2, ship_post_id: 2 } );
			const prev = createState( {
				actions: { byId: { 2: action }, queries: { '2': [ 2 ] } },
			} );

			const state = reduce( prev, { type: 'CREATE_ACTION_START' } );

			expect( state.actions.byId[ 2 ] ).toBe( action );
		} );

		it( 'does not affect heartbeat', () => {
			const prev = createState( { heartbeat: { cursor: 'test-cursor' } } );

			const state = reduce( prev, { type: 'CREATE_ACTION_START' } );

			expect( state.heartbeat.cursor ).toBe( 'test-cursor' );
		} );
	} );

	describe( 'CREATE_ACTION_FINISHED', () => {
		it( 'stores the action in byId and resets create', () => {
			const action = createShipAction();
			const prev = createState( {
				create: {
					action: { type: 'scan_route' as const, params: {} },
					isDraft: true,
					isSubmitting: true,
					error: null,
				},
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FINISHED',
				action,
			} );

			expect( state.actions.byId[ 1 ] ).toBe( action );
			expect( state.create.action ).toBeNull();
			expect( state.create.isDraft ).toBe( false );
			expect( state.create.isSubmitting ).toBe( false );
		} );

		it( 'prepends action ID to existing query for that ship', () => {
			const prev = createState( {
				actions: {
					queries: { '/helm/v1/ships/1/actions': [ 5 ] },
				},
			} );

			const newAction = createShipAction( { id: 10, ship_post_id: 1 } );
			const state = reduce( prev, {
				type: 'CREATE_ACTION_FINISHED',
				action: newAction,
			} );

			expect( state.actions.queries[ '/helm/v1/ships/1/actions' ] ).toEqual( [ 10, 5 ] );
			expect( state.actions.byId[ 10 ] ).toBe( newAction );
		} );

		it( 'does not create a query when none exists for that ship', () => {
			const newAction = createShipAction( { id: 10, ship_post_id: 1 } );
			const state = reduce( undefined, {
				type: 'CREATE_ACTION_FINISHED',
				action: newAction,
			} );

			expect( state.actions.queries[ '/helm/v1/ships/1/actions' ] ).toBeUndefined();
			expect( state.actions.byId[ 10 ] ).toBe( newAction );
		} );

		it( 'does not affect queries for other ships', () => {
			const prev = createState( {
				actions: {
					queries: {
						'/helm/v1/ships/1/actions': [ 5 ],
						'/helm/v1/ships/2/actions': [ 20 ],
					},
				},
			} );

			const newAction = createShipAction( { id: 10, ship_post_id: 1 } );
			const state = reduce( prev, {
				type: 'CREATE_ACTION_FINISHED',
				action: newAction,
			} );

			expect( state.actions.queries[ '/helm/v1/ships/1/actions' ] ).toEqual( [ 10, 5 ] );
			expect( state.actions.queries[ '/helm/v1/ships/2/actions' ] ).toBe( prev.actions.queries[ '/helm/v1/ships/2/actions' ] );
		} );
	} );

	describe( 'CREATE_ACTION_FAILED', () => {
		it( 'stores the error on create and clears isSubmitting', () => {
			const error = new HelmError( 'helm.actions.create_failed', 'Failed' );
			const draft = { type: 'scan_route' as const, params: {} };
			const prev = createState( {
				create: { action: draft, isDraft: true, isSubmitting: true, error: null },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FAILED',
				error,
			} );

			expect( state.create.error ).toBe( error );
			expect( state.create.isSubmitting ).toBe( false );
			expect( state.create.action ).toEqual( draft );
		} );

		it( 'does not remove existing action data', () => {
			const action = createShipAction();
			const prev = createState( {
				actions: { byId: { 1: action }, queries: { '/helm/v1/ships/1/actions': [ 1 ] } },
				create: { action: { type: 'scan_route' as const, params: {} }, isDraft: true, isSubmitting: true, error: null },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FAILED',
				error: new HelmError( 'helm.test', 'Error' ),
			} );

			expect( state.actions.byId[ 1 ] ).toBe( action );
		} );
	} );

	describe( 'FETCH_ACTION_START', () => {
		it( 'sets isLoading for the action and clears its error', () => {
			const prev = createState( {
				actions: { error: { 42: new HelmError( 'helm.test', 'Previous error' ) } },
			} );

			const state = reduce( prev, { type: 'FETCH_ACTION_START', actionId: 42 } );

			expect( state.actions.isLoading[ 42 ] ).toBe( true );
			expect( state.actions.error[ 42 ] ).toBeUndefined();
		} );

		it( 'does not affect other actions', () => {
			const otherError = new HelmError( 'helm.test', 'Other' );
			const prev = createState( {
				actions: { isLoading: { 99: true }, error: { 99: otherError } },
			} );

			const state = reduce( prev, { type: 'FETCH_ACTION_START', actionId: 42 } );

			expect( state.actions.isLoading[ 99 ] ).toBe( true );
			expect( state.actions.error[ 99 ] ).toBe( otherError );
		} );
	} );

	describe( 'FETCH_ACTION_FINISHED', () => {
		it( 'stores the action in byId and clears isLoading', () => {
			const action = createShipAction( { id: 3, ship_post_id: 1 } );
			const prev = createState( {
				actions: { isLoading: { 3: true } },
			} );

			const state = reduce( prev, {
				type: 'FETCH_ACTION_FINISHED',
				action,
			} );

			expect( state.actions.byId[ 3 ] ).toBe( action );
			expect( state.actions.isLoading[ 3 ] ).toBeUndefined();
			expect( state.actions.error[ 3 ] ).toBeUndefined();
		} );

		it( 'does not modify queries', () => {
			const prev = createState( {
				actions: {
					queries: { '/helm/v1/ships/1/actions': [ 3 ] },
				},
			} );

			const updated = createShipAction( { id: 3, ship_post_id: 1, status: 'fulfilled' } );
			const state = reduce( prev, {
				type: 'FETCH_ACTION_FINISHED',
				action: updated,
			} );

			expect( state.actions.queries ).toBe( prev.actions.queries );
			expect( state.actions.byId[ 3 ]!.status ).toBe( 'fulfilled' );
		} );
	} );

	describe( 'FETCH_ACTION_FAILED', () => {
		it( 'stores the error and clears isLoading', () => {
			const prev = createState( {
				actions: { isLoading: { 42: true } },
			} );
			const error = new HelmError( 'helm.test', 'Error' );

			const state = reduce( prev, { type: 'FETCH_ACTION_FAILED', actionId: 42, error } );

			expect( state.actions.isLoading[ 42 ] ).toBeUndefined();
			expect( state.actions.error[ 42 ] ).toBe( error );
		} );
	} );

	describe( 'RECEIVE_ACTION', () => {
		it( 'stores the action in byId', () => {
			const action = createShipAction( { id: 7, ship_post_id: 5 } );

			const state = reduce( undefined, {
				type: 'RECEIVE_ACTION',
				action,
			} );

			expect( state.actions.byId[ 7 ] ).toBe( action );
		} );

		it( 'does not modify queries', () => {
			const prev = createState( {
				actions: {
					queries: { '/helm/v1/ships/1/actions': [ 10 ] },
				},
			} );

			const action = createShipAction( { id: 8, ship_post_id: 1 } );
			const state = reduce( prev, { type: 'RECEIVE_ACTION', action } );

			expect( state.actions.queries ).toBe( prev.actions.queries );
		} );
	} );

	describe( 'RECEIVE_HEARTBEAT', () => {
		it( 'merges actions into byId and sets heartbeat cursor', () => {
			const actions = [
				createShipAction( { id: 10, ship_post_id: 1 } ),
				createShipAction( { id: 20, ship_post_id: 1 } ),
			];

			const state = reduce( undefined, {
				type: 'RECEIVE_HEARTBEAT',
				actions,
				cursor: '2025-06-01T00:00:00Z',
			} );

			expect( state.actions.byId[ 10 ] ).toBe( actions[ 0 ] );
			expect( state.actions.byId[ 20 ] ).toBe( actions[ 1 ] );
			expect( state.heartbeat.cursor ).toBe( '2025-06-01T00:00:00Z' );
		} );

		it( 'merges with existing actions in byId', () => {
			const existing = createShipAction( { id: 1, ship_post_id: 1 } );
			const prev = createState( {
				actions: { byId: { 1: existing } },
			} );

			const incoming = createShipAction( { id: 2, ship_post_id: 1 } );
			const state = reduce( prev, {
				type: 'RECEIVE_HEARTBEAT',
				actions: [ incoming ],
				cursor: '2025-06-01T00:00:00Z',
			} );

			expect( state.actions.byId[ 1 ] ).toBe( existing );
			expect( state.actions.byId[ 2 ] ).toBe( incoming );
		} );

		it( 'updates cursor even with empty actions array', () => {
			const prev = createState( { heartbeat: { cursor: 'old-cursor' } } );

			const state = reduce( prev, {
				type: 'RECEIVE_HEARTBEAT',
				actions: [],
				cursor: 'new-cursor',
			} );

			expect( state.heartbeat.cursor ).toBe( 'new-cursor' );
		} );

		it( 'does not modify byId reference for empty actions', () => {
			const existing = createShipAction();
			const prev = createState( {
				actions: { byId: { 1: existing } },
			} );

			const state = reduce( prev, {
				type: 'RECEIVE_HEARTBEAT',
				actions: [],
				cursor: 'new-cursor',
			} );

			expect( state.actions.byId ).toBe( prev.actions.byId );
		} );

		it( 'updates existing action in byId', () => {
			const existing = createShipAction( { id: 5, ship_post_id: 1, status: 'running' } );
			const prev = createState( {
				actions: { byId: { 5: existing } },
			} );

			const updated = createShipAction( { id: 5, ship_post_id: 1, status: 'fulfilled' } );
			const state = reduce( prev, {
				type: 'RECEIVE_HEARTBEAT',
				actions: [ updated ],
				cursor: '2025-06-01T00:00:00Z',
			} );

			expect( state.actions.byId[ 5 ]!.status ).toBe( 'fulfilled' );
		} );

		it( 'does not modify queries', () => {
			const prev = createState( {
				actions: {
					queries: { '/helm/v1/ships/1/actions': [ 5 ] },
				},
			} );

			const state = reduce( prev, {
				type: 'RECEIVE_HEARTBEAT',
				actions: [ createShipAction( { id: 10, ship_post_id: 1 } ) ],
				cursor: '2025-06-01T00:00:00Z',
			} );

			expect( state.actions.queries ).toBe( prev.actions.queries );
		} );
	} );

	describe( 'FETCH_ACTIONS_START', () => {
		it( 'sets isLoading and clears error', () => {
			const prev = createState( {
				actions: {
					meta: {
						'/helm/v1/ships/1/actions': { next: 'http://test/next', isLoading: false, error: new HelmError( 'helm.test', 'E' ) },
					},
				},
			} );

			const state = reduce( prev, { type: 'FETCH_ACTIONS_START', queryId: '/helm/v1/ships/1/actions' } );

			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.isLoading ).toBe( true );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.error ).toBeNull();
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.next ).toBe( 'http://test/next' );
		} );

		it( 'initializes meta for new query', () => {
			const state = reduce( undefined, { type: 'FETCH_ACTIONS_START', queryId: '/helm/v1/ships/5/actions' } );

			expect( state.actions.meta[ '/helm/v1/ships/5/actions' ] ).toEqual( {
				next: null,
				isLoading: true,
				error: null,
			} );
		} );
	} );

	describe( 'FETCH_ACTIONS_FINISHED', () => {
		it( 'replaces query IDs and sets next URL', () => {
			const actions = [
				createShipAction( { id: 10, ship_post_id: 1 } ),
				createShipAction( { id: 9, ship_post_id: 1 } ),
			];

			const state = reduce( undefined, {
				type: 'FETCH_ACTIONS_FINISHED',
				queryId: '/helm/v1/ships/1/actions',
				actions,
				next: 'http://test/next',
			} );

			expect( state.actions.queries[ '/helm/v1/ships/1/actions' ] ).toEqual( [ 10, 9 ] );
			expect( state.actions.byId[ 10 ] ).toBe( actions[ 0 ] );
			expect( state.actions.byId[ 9 ] ).toBe( actions[ 1 ] );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ] ).toEqual( {
				next: 'http://test/next',
				isLoading: false,
				error: null,
			} );
		} );

		it( 'replaces existing query IDs on refetch', () => {
			const prev = createState( {
				actions: {
					byId: { 10: createShipAction( { id: 10 } ) },
					queries: { '/helm/v1/ships/1/actions': [ 10 ] },
					meta: { '/helm/v1/ships/1/actions': { next: null, isLoading: true, error: null } },
				},
			} );

			const state = reduce( prev, {
				type: 'FETCH_ACTIONS_FINISHED',
				queryId: '/helm/v1/ships/1/actions',
				actions: [ createShipAction( { id: 9 } ) ],
				next: null,
			} );

			expect( state.actions.queries[ '/helm/v1/ships/1/actions' ] ).toEqual( [ 9 ] );
		} );

		it( 'sets next to null on last page', () => {
			const state = reduce( undefined, {
				type: 'FETCH_ACTIONS_FINISHED',
				queryId: '/helm/v1/ships/1/actions',
				actions: [ createShipAction( { id: 5 } ) ],
				next: null,
			} );

			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.next ).toBeNull();
		} );
	} );

	describe( 'FETCH_ACTIONS_FAILED', () => {
		it( 'sets error and clears isLoading', () => {
			const prev = createState( {
				actions: {
					meta: { '/helm/v1/ships/1/actions': { next: 'http://test/next', isLoading: true, error: null } },
				},
			} );
			const error = new HelmError( 'helm.test', 'Failed' );

			const state = reduce( prev, { type: 'FETCH_ACTIONS_FAILED', queryId: '/helm/v1/ships/1/actions', error } );

			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.isLoading ).toBe( false );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.error ).toBe( error );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.next ).toBe( 'http://test/next' );
		} );
	} );

	describe( 'LOAD_MORE_START', () => {
		it( 'sets isLoading and clears error', () => {
			const prev = createState( {
				actions: {
					meta: {
						'/helm/v1/ships/1/actions': { next: 'http://test/page2', isLoading: false, error: new HelmError( 'helm.test', 'E' ) },
					},
				},
			} );

			const state = reduce( prev, { type: 'LOAD_MORE_START', queryId: '/helm/v1/ships/1/actions' } );

			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.isLoading ).toBe( true );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.error ).toBeNull();
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.next ).toBe( 'http://test/page2' );
		} );
	} );

	describe( 'LOAD_MORE_FINISHED', () => {
		it( 'appends action IDs to existing query', () => {
			const prev = createState( {
				actions: {
					byId: { 10: createShipAction( { id: 10 } ) },
					queries: { '/helm/v1/ships/1/actions': [ 10 ] },
					meta: { '/helm/v1/ships/1/actions': { next: 'http://test/page2', isLoading: true, error: null } },
				},
			} );

			const page2 = [ createShipAction( { id: 9 } ), createShipAction( { id: 8 } ) ];
			const state = reduce( prev, {
				type: 'LOAD_MORE_FINISHED',
				queryId: '/helm/v1/ships/1/actions',
				actions: page2,
				next: 'http://test/page3',
			} );

			expect( state.actions.queries[ '/helm/v1/ships/1/actions' ] ).toEqual( [ 10, 9, 8 ] );
			expect( state.actions.byId[ 9 ] ).toBe( page2[ 0 ] );
			expect( state.actions.byId[ 8 ] ).toBe( page2[ 1 ] );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ] ).toEqual( {
				next: 'http://test/page3',
				isLoading: false,
				error: null,
			} );
		} );

		it( 'sets next to null on last page', () => {
			const prev = createState( {
				actions: {
					queries: { '/helm/v1/ships/1/actions': [ 10 ] },
					meta: { '/helm/v1/ships/1/actions': { next: 'http://test/page2', isLoading: true, error: null } },
				},
			} );

			const state = reduce( prev, {
				type: 'LOAD_MORE_FINISHED',
				queryId: '/helm/v1/ships/1/actions',
				actions: [ createShipAction( { id: 9 } ) ],
				next: null,
			} );

			expect( state.actions.queries[ '/helm/v1/ships/1/actions' ] ).toEqual( [ 10, 9 ] );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.next ).toBeNull();
		} );
	} );

	describe( 'LOAD_MORE_FAILED', () => {
		it( 'sets error and clears isLoading', () => {
			const prev = createState( {
				actions: {
					meta: { '/helm/v1/ships/1/actions': { next: 'http://test/page2', isLoading: true, error: null } },
				},
			} );
			const error = new HelmError( 'helm.test', 'Failed' );

			const state = reduce( prev, { type: 'LOAD_MORE_FAILED', queryId: '/helm/v1/ships/1/actions', error } );

			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.isLoading ).toBe( false );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.error ).toBe( error );
			expect( state.actions.meta[ '/helm/v1/ships/1/actions' ]!.next ).toBe( 'http://test/page2' );
		} );
	} );

	describe( 'unknown action', () => {
		it( 'returns the same state', () => {
			const prev = initializeDefaultState();
			const state = reduce( prev, { type: 'UNKNOWN' } as never );

			expect( state ).toBe( prev );
		} );
	} );
} );
