import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { reducer, initializeDefaultState } from '../reducer';
import { createShipState, createSystemComponent, createState } from './fixtures';

function reduce( state = initializeDefaultState(), action: Parameters< typeof reducer >[ 1 ] ) {
	return reducer( state, action );
}

describe( 'reducer', () => {
	describe( 'initializeDefaultState', () => {
		it( 'returns empty ships and systems slices', () => {
			expect( initializeDefaultState() ).toEqual( {
				ships: {
					byId: {},
					isLoading: {},
					errors: {},
				},
				systems: {
					byShipId: {},
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
				ships: { errors: { 1: new HelmError( 'helm.ship.not_found', 'Not found' ) } },
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
				ships: {
					byId: { 2: ship2 },
					isLoading: { 2: false },
				},
			} );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_START',
				shipId: 1,
			} );

			expect( state.ships.byId[ 2 ] ).toBe( ship2 );
			expect( state.ships.isLoading[ 2 ] ).toBe( false );
		} );

		it( 'does not affect systems slice', () => {
			const systems = [ createSystemComponent() ];
			const prev = createState( {
				systems: { byShipId: { 1: systems } },
			} );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_START',
				shipId: 1,
			} );

			expect( state.systems.byShipId[ 1 ] ).toBe( systems );
		} );
	} );

	describe( 'FETCH_SHIP_FINISHED', () => {
		it( 'stores the ship and clears loading', () => {
			const ship = createShipState();
			const prev = createState( { ships: { isLoading: { 1: true } } } );

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
				ships: {
					isLoading: { 1: true },
					errors: { 1: new HelmError( 'helm.test', 'Error' ) },
				},
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
			const prev = createState( { ships: { byId: { 1: original } } } );

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
			const prev = createState( { ships: { isLoading: { 1: true } } } );

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
				ships: {
					byId: { 1: ship },
					isLoading: { 1: true },
				},
			} );

			const state = reduce( prev, {
				type: 'FETCH_SHIP_FAILED',
				shipId: 1,
				error: new HelmError( 'helm.test', 'Error' ),
			} );

			expect( state.ships.byId[ 1 ] ).toBe( ship );
		} );
	} );

	describe( 'FETCH_SYSTEMS_START', () => {
		it( 'sets isLoading for the ship systems', () => {
			const state = reduce( undefined, {
				type: 'FETCH_SYSTEMS_START',
				shipId: 1,
			} );

			expect( state.systems.isLoading[ 1 ] ).toBe( true );
		} );

		it( 'clears any existing error', () => {
			const prev = createState( {
				systems: { errors: { 1: new HelmError( 'helm.test', 'Error' ) } },
			} );

			const state = reduce( prev, {
				type: 'FETCH_SYSTEMS_START',
				shipId: 1,
			} );

			expect( state.systems.errors[ 1 ] ).toBeUndefined();
		} );

		it( 'does not affect ships slice', () => {
			const ship = createShipState();
			const prev = createState( {
				ships: { byId: { 1: ship } },
			} );

			const state = reduce( prev, {
				type: 'FETCH_SYSTEMS_START',
				shipId: 1,
			} );

			expect( state.ships.byId[ 1 ] ).toBe( ship );
		} );
	} );

	describe( 'FETCH_SYSTEMS_FINISHED', () => {
		it( 'stores the systems and clears loading', () => {
			const systems = [ createSystemComponent() ];
			const prev = createState( { systems: { isLoading: { 1: true } } } );

			const state = reduce( prev, {
				type: 'FETCH_SYSTEMS_FINISHED',
				shipId: 1,
				systems,
			} );

			expect( state.systems.byShipId[ 1 ] ).toBe( systems );
			expect( state.systems.isLoading[ 1 ] ).toBe( false );
		} );

		it( 'clears any existing error', () => {
			const prev = createState( {
				systems: {
					isLoading: { 1: true },
					errors: { 1: new HelmError( 'helm.test', 'Error' ) },
				},
			} );

			const state = reduce( prev, {
				type: 'FETCH_SYSTEMS_FINISHED',
				shipId: 1,
				systems: [ createSystemComponent() ],
			} );

			expect( state.systems.errors[ 1 ] ).toBeUndefined();
		} );

		it( 'replaces existing systems', () => {
			const original = [ createSystemComponent( { condition: 0.5 } ) ];
			const updated = [ createSystemComponent( { condition: 1.0 } ) ];
			const prev = createState( { systems: { byShipId: { 1: original } } } );

			const state = reduce( prev, {
				type: 'FETCH_SYSTEMS_FINISHED',
				shipId: 1,
				systems: updated,
			} );

			expect( state.systems.byShipId[ 1 ][ 0 ].condition ).toBe( 1.0 );
		} );
	} );

	describe( 'FETCH_SYSTEMS_FAILED', () => {
		it( 'stores the error and clears loading', () => {
			const error = new HelmError( 'helm.test', 'Error' );
			const prev = createState( { systems: { isLoading: { 1: true } } } );

			const state = reduce( prev, {
				type: 'FETCH_SYSTEMS_FAILED',
				shipId: 1,
				error,
			} );

			expect( state.systems.errors[ 1 ] ).toBe( error );
			expect( state.systems.isLoading[ 1 ] ).toBe( false );
		} );

		it( 'does not remove existing systems data', () => {
			const systems = [ createSystemComponent() ];
			const prev = createState( {
				systems: {
					byShipId: { 1: systems },
					isLoading: { 1: true },
				},
			} );

			const state = reduce( prev, {
				type: 'FETCH_SYSTEMS_FAILED',
				shipId: 1,
				error: new HelmError( 'helm.test', 'Error' ),
			} );

			expect( state.systems.byShipId[ 1 ] ).toBe( systems );
		} );
	} );

	describe( 'PATCH_SHIP_START', () => {
		it( 'sets isLoading for the ship', () => {
			const state = reduce( undefined, {
				type: 'PATCH_SHIP_START',
				shipId: 1,
			} );

			expect( state.ships.isLoading[ 1 ] ).toBe( true );
		} );

		it( 'clears any existing error for the ship', () => {
			const prev = createState( {
				ships: { errors: { 1: new HelmError( 'helm.test', 'Error' ) } },
			} );

			const state = reduce( prev, {
				type: 'PATCH_SHIP_START',
				shipId: 1,
			} );

			expect( state.ships.errors[ 1 ] ).toBeUndefined();
		} );
	} );

	describe( 'PATCH_SHIP_FINISHED', () => {
		it( 'stores the ship and clears loading', () => {
			const ship = createShipState( { power_mode: 'overdrive' } );
			const prev = createState( { ships: { isLoading: { 1: true } } } );

			const state = reduce( prev, {
				type: 'PATCH_SHIP_FINISHED',
				shipId: 1,
				ship,
			} );

			expect( state.ships.byId[ 1 ] ).toBe( ship );
			expect( state.ships.byId[ 1 ].power_mode ).toBe( 'overdrive' );
			expect( state.ships.isLoading[ 1 ] ).toBe( false );
		} );

		it( 'clears any existing error for the ship', () => {
			const prev = createState( {
				ships: {
					isLoading: { 1: true },
					errors: { 1: new HelmError( 'helm.test', 'Error' ) },
				},
			} );

			const state = reduce( prev, {
				type: 'PATCH_SHIP_FINISHED',
				shipId: 1,
				ship: createShipState(),
			} );

			expect( state.ships.errors[ 1 ] ).toBeUndefined();
		} );
	} );

	describe( 'PATCH_SHIP_FAILED', () => {
		it( 'stores the error and clears loading', () => {
			const error = new HelmError( 'helm.ships.patch_failed', 'Patch failed' );
			const prev = createState( { ships: { isLoading: { 1: true } } } );

			const state = reduce( prev, {
				type: 'PATCH_SHIP_FAILED',
				shipId: 1,
				error,
			} );

			expect( state.ships.errors[ 1 ] ).toBe( error );
			expect( state.ships.isLoading[ 1 ] ).toBe( false );
		} );

		it( 'does not remove existing ship data', () => {
			const ship = createShipState();
			const prev = createState( {
				ships: {
					byId: { 1: ship },
					isLoading: { 1: true },
				},
			} );

			const state = reduce( prev, {
				type: 'PATCH_SHIP_FAILED',
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
