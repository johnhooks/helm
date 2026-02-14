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
					byShipId: {},
					errors: {},
				},
				create: {
					action: null,
					isDraft: false,
					isSubmitting: false,
					error: null,
				},
				meta: {
					cursor: null,
				},
			} );
		} );
	} );

	describe( 'CREATE_DRAFT', () => {
		it( 'sets the draft action with isDraft flag', () => {
			const draft = { type: 'scan_route', params: { target_node_id: 5 } };
			const state = reduce( undefined, { type: 'CREATE_DRAFT', action: draft } );

			expect( state.create.action ).toEqual( draft );
			expect( state.create.isDraft ).toBe( true );
			expect( state.create.isSubmitting ).toBe( false );
			expect( state.create.error ).toBeNull();
		} );

		it( 'resets error from a previous failed create', () => {
			const prev = createState( {
				create: {
					action: { type: 'scan_route', params: {} },
					isDraft: true,
					isSubmitting: false,
					error: new HelmError( 'helm.test', 'Error' ),
				},
			} );

			const draft = { type: 'scan_route', params: { target_node_id: 10 } };
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
					action: { type: 'scan_route', params: {} },
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
					action: { type: 'scan_route', params: {} },
					isDraft: true,
					isSubmitting: false,
					error: new HelmError( 'helm.test', 'Error' ),
				},
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_START',
				shipId: 1,
			} );

			expect( state.create.isSubmitting ).toBe( true );
			expect( state.create.error ).toBeNull();
			expect( state.create.action ).toEqual( { type: 'scan_route', params: {} } );
			expect( state.create.isDraft ).toBe( true );
		} );

		it( 'does not affect actions state', () => {
			const action = createShipAction( { id: 2, ship_post_id: 2 } );
			const prev = createState( {
				actions: { byShipId: { 2: action } },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_START',
				shipId: 1,
			} );

			expect( state.actions.byShipId[ 2 ] ).toBe( action );
		} );

		it( 'does not affect meta', () => {
			const prev = createState( { meta: { cursor: 'test-cursor' } } );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_START',
				shipId: 1,
			} );

			expect( state.meta.cursor ).toBe( 'test-cursor' );
		} );
	} );

	describe( 'CREATE_ACTION_FINISHED', () => {
		it( 'stores the action and resets the create slice', () => {
			const action = createShipAction();
			const prev = createState( {
				create: {
					action: { type: 'scan_route', params: {} },
					isDraft: true,
					isSubmitting: true,
					error: null,
				},
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FINISHED',
				shipId: 1,
				action,
			} );

			expect( state.actions.byShipId[ 1 ] ).toBe( action );
			expect( state.create.action ).toBeNull();
			expect( state.create.isDraft ).toBe( false );
			expect( state.create.isSubmitting ).toBe( false );
			expect( state.create.error ).toBeNull();
		} );

		it( 'replaces an existing action', () => {
			const original = createShipAction( { status: 'pending' } );
			const updated = createShipAction( { status: 'running' } );
			const prev = createState( {
				actions: { byShipId: { 1: original } },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FINISHED',
				shipId: 1,
				action: updated,
			} );

			expect( state.actions.byShipId[ 1 ]!.status ).toBe( 'running' );
		} );
	} );

	describe( 'CREATE_ACTION_FAILED', () => {
		it( 'stores the error on create and clears isSubmitting', () => {
			const error = new HelmError( 'helm.actions.create_failed', 'Failed' );
			const draft = { type: 'scan_route', params: {} };
			const prev = createState( {
				create: { action: draft, isDraft: true, isSubmitting: true, error: null },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FAILED',
				shipId: 1,
				error,
			} );

			expect( state.create.error ).toBe( error );
			expect( state.create.isSubmitting ).toBe( false );
			expect( state.create.action ).toEqual( draft );
		} );

		it( 'does not remove existing action data', () => {
			const action = createShipAction();
			const prev = createState( {
				actions: { byShipId: { 1: action } },
				create: { action: { type: 'scan_route', params: {} }, isDraft: true, isSubmitting: true, error: null },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FAILED',
				shipId: 1,
				error: new HelmError( 'helm.test', 'Error' ),
			} );

			expect( state.actions.byShipId[ 1 ] ).toBe( action );
		} );
	} );

	describe( 'FETCH_ACTION_START', () => {
		it( 'returns the same state', () => {
			const prev = initializeDefaultState();

			const state = reduce( prev, {
				type: 'FETCH_ACTION_START',
				shipId: 1,
			} );

			expect( state ).toBe( prev );
		} );
	} );

	describe( 'FETCH_ACTION_FINISHED', () => {
		it( 'stores the action', () => {
			const action = createShipAction();

			const state = reduce( undefined, {
				type: 'FETCH_ACTION_FINISHED',
				shipId: 1,
				action,
			} );

			expect( state.actions.byShipId[ 1 ] ).toBe( action );
		} );

		it( 'stores null when no action exists', () => {
			const state = reduce( undefined, {
				type: 'FETCH_ACTION_FINISHED',
				shipId: 1,
				action: null,
			} );

			expect( state.actions.byShipId[ 1 ] ).toBeNull();
		} );
	} );

	describe( 'FETCH_ACTION_FAILED', () => {
		it( 'stores the error', () => {
			const error = new HelmError( 'helm.actions.invalid_response', 'Error' );

			const state = reduce( undefined, {
				type: 'FETCH_ACTION_FAILED',
				shipId: 1,
				error,
			} );

			expect( state.actions.errors[ 1 ] ).toBe( error );
		} );

		it( 'does not remove existing action data', () => {
			const action = createShipAction();
			const prev = createState( {
				actions: { byShipId: { 1: action } },
			} );

			const state = reduce( prev, {
				type: 'FETCH_ACTION_FAILED',
				shipId: 1,
				error: new HelmError( 'helm.test', 'Error' ),
			} );

			expect( state.actions.byShipId[ 1 ] ).toBe( action );
		} );
	} );

	describe( 'RECEIVE_ACTION', () => {
		it( 'stores the action by ship id', () => {
			const action = createShipAction( { ship_post_id: 5 } );

			const state = reduce( undefined, {
				type: 'RECEIVE_ACTION',
				shipId: 5,
				action,
			} );

			expect( state.actions.byShipId[ 5 ] ).toBe( action );
		} );

		it( 'does not touch create or errors', () => {
			const prev = createState( {
				actions: {
					errors: { 5: new HelmError( 'helm.test', 'Error' ) },
				},
			} );

			const state = reduce( prev, {
				type: 'RECEIVE_ACTION',
				shipId: 5,
				action: createShipAction( { ship_post_id: 5 } ),
			} );

			expect( state.actions.errors[ 5 ] ).toBeDefined();
		} );
	} );

	describe( 'RECEIVE_HEARTBEAT', () => {
		it( 'merges actions by ship_post_id and sets cursor', () => {
			const actions = [
				createShipAction( { id: 10, ship_post_id: 1 } ),
				createShipAction( { id: 20, ship_post_id: 2 } ),
			];

			const state = reduce( undefined, {
				type: 'RECEIVE_HEARTBEAT',
				actions,
				cursor: '2025-06-01T00:00:00Z',
			} );

			expect( state.actions.byShipId[ 1 ] ).toBe( actions[ 0 ] );
			expect( state.actions.byShipId[ 2 ] ).toBe( actions[ 1 ] );
			expect( state.meta.cursor ).toBe( '2025-06-01T00:00:00Z' );
		} );

		it( 'merges with existing actions', () => {
			const existing = createShipAction( { id: 1, ship_post_id: 1 } );
			const prev = createState( {
				actions: { byShipId: { 1: existing } },
			} );

			const incoming = createShipAction( { id: 2, ship_post_id: 2 } );
			const state = reduce( prev, {
				type: 'RECEIVE_HEARTBEAT',
				actions: [ incoming ],
				cursor: '2025-06-01T00:00:00Z',
			} );

			expect( state.actions.byShipId[ 1 ] ).toBe( existing );
			expect( state.actions.byShipId[ 2 ] ).toBe( incoming );
		} );

		it( 'updates cursor even with empty actions array', () => {
			const prev = createState( {
				meta: { cursor: 'old-cursor' },
			} );

			const state = reduce( prev, {
				type: 'RECEIVE_HEARTBEAT',
				actions: [],
				cursor: 'new-cursor',
			} );

			expect( state.meta.cursor ).toBe( 'new-cursor' );
		} );

		it( 'does not modify byShipId reference for empty actions', () => {
			const existing = createShipAction();
			const prev = createState( {
				actions: { byShipId: { 1: existing } },
			} );

			const state = reduce( prev, {
				type: 'RECEIVE_HEARTBEAT',
				actions: [],
				cursor: 'new-cursor',
			} );

			expect( state.actions.byShipId ).toBe( prev.actions.byShipId );
		} );
	} );

	describe( 'CLEAR_ACTION', () => {
		it( 'sets the action and error to null', () => {
			const prev = createState( {
				actions: {
					byShipId: { 1: createShipAction() },
					errors: { 1: new HelmError( 'helm.test', 'Error' ) },
				},
			} );

			const state = reduce( prev, {
				type: 'CLEAR_ACTION',
				shipId: 1,
			} );

			expect( state.actions.byShipId[ 1 ] ).toBeNull();
			expect( state.actions.errors[ 1 ] ).toBeNull();
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
