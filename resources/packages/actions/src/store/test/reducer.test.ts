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
					creating: {},
					errors: {},
				},
				meta: {
					cursor: null,
				},
			} );
		} );
	} );

	describe( 'CREATE_ACTION_START', () => {
		it( 'sets creating for the ship', () => {
			const state = reduce( undefined, {
				type: 'CREATE_ACTION_START',
				shipId: 1,
			} );

			expect( state.actions.creating[ 1 ] ).toBe( true );
		} );

		it( 'clears any existing error for the ship', () => {
			const prev = createState( {
				actions: { errors: { 1: new HelmError( 'helm.test', 'Error' ) } },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_START',
				shipId: 1,
			} );

			expect( state.actions.errors[ 1 ] ).toBeUndefined();
		} );

		it( 'does not affect other ships', () => {
			const action2 = createShipAction( { id: 2, ship_post_id: 2 } );
			const prev = createState( {
				actions: { byShipId: { 2: action2 }, creating: { 2: false } },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_START',
				shipId: 1,
			} );

			expect( state.actions.byShipId[ 2 ] ).toBe( action2 );
			expect( state.actions.creating[ 2 ] ).toBe( false );
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
		it( 'stores the action, clears creating and error', () => {
			const action = createShipAction();
			const prev = createState( {
				actions: {
					creating: { 1: true },
					errors: { 1: new HelmError( 'helm.test', 'Error' ) },
				},
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FINISHED',
				shipId: 1,
				action,
			} );

			expect( state.actions.byShipId[ 1 ] ).toBe( action );
			expect( state.actions.creating[ 1 ] ).toBe( false );
			expect( state.actions.errors[ 1 ] ).toBeNull();
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
		it( 'stores the error and clears creating', () => {
			const error = new HelmError( 'helm.actions.create_failed', 'Failed' );
			const prev = createState( {
				actions: { creating: { 1: true } },
			} );

			const state = reduce( prev, {
				type: 'CREATE_ACTION_FAILED',
				shipId: 1,
				error,
			} );

			expect( state.actions.errors[ 1 ] ).toBe( error );
			expect( state.actions.creating[ 1 ] ).toBe( false );
		} );

		it( 'does not remove existing action data', () => {
			const action = createShipAction();
			const prev = createState( {
				actions: { byShipId: { 1: action }, creating: { 1: true } },
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

		it( 'does not touch creating or errors', () => {
			const prev = createState( {
				actions: {
					creating: { 5: true },
					errors: { 5: new HelmError( 'helm.test', 'Error' ) },
				},
			} );

			const state = reduce( prev, {
				type: 'RECEIVE_ACTION',
				shipId: 5,
				action: createShipAction( { ship_post_id: 5 } ),
			} );

			expect( state.actions.creating[ 5 ] ).toBe( true );
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
