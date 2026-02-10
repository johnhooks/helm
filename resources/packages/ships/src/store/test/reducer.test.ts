import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { reducer, initializeDefaultState } from '../reducer';
import { createShipState, createState } from './fixtures';

function reduce( state = initializeDefaultState(), action: Parameters< typeof reducer >[ 1 ] ) {
	return reducer( state, action );
}

describe( 'reducer', () => {
	describe( 'initializeDefaultState', () => {
		it( 'returns empty ships slice', () => {
			expect( initializeDefaultState() ).toEqual( {
				ships: {
					byId: {},
					isLoading: {},
					errors: {},
				},
			} );
		} );
	} );

	describe( 'FETCH_SHIP_START', () => {
		it( 'sets isLoading for the ship', () => {
			const state = reduce( undefined, {
				type: 'FETCH_SHIP_START',
				shipId: 1,
			} );

			expect( state.ships.isLoading[ 1 ] ).toBe( true );
		} );

		it( 'clears any existing error for the ship', () => {
			const prev = createState( {
				errors: { 1: new HelmError( 'helm.ship.not_found', 'Not found' ) },
			} );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_START',
				shipId: 1,
			} );

			expect( state.ships.errors[ 1 ] ).toBeUndefined();
		} );

		it( 'does not affect other ships', () => {
			const ship2 = createShipState( { id: 2 } );
			const prev = createState( {
				byId: { 2: ship2 },
				isLoading: { 2: false },
			} );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_START',
				shipId: 1,
			} );

			expect( state.ships.byId[ 2 ] ).toBe( ship2 );
			expect( state.ships.isLoading[ 2 ] ).toBe( false );
		} );
	} );

	describe( 'FETCH_SHIP_FINISHED', () => {
		it( 'stores the ship and clears loading', () => {
			const ship = createShipState();
			const prev = createState( { isLoading: { 1: true } } );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_FINISHED',
				shipId: 1,
				ship,
			} );

			expect( state.ships.byId[ 1 ] ).toBe( ship );
			expect( state.ships.isLoading[ 1 ] ).toBe( false );
		} );

		it( 'clears any existing error for the ship', () => {
			const prev = createState( {
				isLoading: { 1: true },
				errors: { 1: new HelmError( 'helm.test', 'Error' ) },
			} );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_FINISHED',
				shipId: 1,
				ship: createShipState(),
			} );

			expect( state.ships.errors[ 1 ] ).toBeUndefined();
		} );

		it( 'replaces an existing ship', () => {
			const original = createShipState( { hull_integrity: 80 } );
			const updated = createShipState( { hull_integrity: 100 } );
			const prev = createState( { byId: { 1: original } } );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_FINISHED',
				shipId: 1,
				ship: updated,
			} );

			expect( state.ships.byId[ 1 ].hull_integrity ).toBe( 100 );
		} );
	} );

	describe( 'FETCH_SHIP_FAILED', () => {
		it( 'stores the error and clears loading', () => {
			const error = new HelmError( 'helm.ship.not_found', 'Not found' );
			const prev = createState( { isLoading: { 1: true } } );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_FAILED',
				shipId: 1,
				error,
			} );

			expect( state.ships.errors[ 1 ] ).toBe( error );
			expect( state.ships.isLoading[ 1 ] ).toBe( false );
		} );

		it( 'does not remove existing ship data', () => {
			const ship = createShipState();
			const prev = createState( {
				byId: { 1: ship },
				isLoading: { 1: true },
			} );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_FAILED',
				shipId: 1,
				error: new HelmError( 'helm.test', 'Error' ),
			} );

			expect( state.ships.byId[ 1 ] ).toBe( ship );
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
