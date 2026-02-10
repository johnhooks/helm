import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { getShip, isShipLoading, getShipError } from '../selectors';
import { createShipState, createState } from './fixtures';

describe( 'getShip', () => {
	it( 'returns the ship when it exists', () => {
		const ship = createShipState();
		const state = createState( { byId: { 1: ship } } );

		expect( getShip( state, 1 ) ).toBe( ship );
	} );

	it( 'returns undefined for unknown ship', () => {
		const state = createState();

		expect( getShip( state, 999 ) ).toBeUndefined();
	} );
} );

describe( 'isShipLoading', () => {
	it( 'returns true when loading', () => {
		const state = createState( { isLoading: { 1: true } } );

		expect( isShipLoading( state, 1 ) ).toBe( true );
	} );

	it( 'returns false when not loading', () => {
		const state = createState( { isLoading: { 1: false } } );

		expect( isShipLoading( state, 1 ) ).toBe( false );
	} );

	it( 'returns false for unknown ship', () => {
		const state = createState();

		expect( isShipLoading( state, 999 ) ).toBe( false );
	} );
} );

describe( 'getShipError', () => {
	it( 'returns the error when it exists', () => {
		const error = new HelmError( 'helm.ship.not_found', 'Not found' );
		const state = createState( { errors: { 1: error } } );

		expect( getShipError( state, 1 ) ).toBe( error );
	} );

	it( 'returns undefined when no error', () => {
		const state = createState();

		expect( getShipError( state, 999 ) ).toBeUndefined();
	} );
} );
