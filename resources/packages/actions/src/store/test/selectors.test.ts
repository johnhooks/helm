import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { getCurrentAction, isCreating, getError, getCursor } from '../selectors';
import { createShipAction, createState } from './fixtures';

describe( 'getCurrentAction', () => {
	it( 'returns the action when it exists', () => {
		const action = createShipAction();
		const state = createState( { actions: { byShipId: { 1: action } } } );

		expect( getCurrentAction( state, 1 ) ).toBe( action );
	} );

	it( 'returns null for unknown ship', () => {
		const state = createState();

		expect( getCurrentAction( state, 999 ) ).toBeNull();
	} );

	it( 'returns null when explicitly set to null', () => {
		const state = createState( { actions: { byShipId: { 1: null } } } );

		expect( getCurrentAction( state, 1 ) ).toBeNull();
	} );
} );

describe( 'isCreating', () => {
	it( 'returns true when creating', () => {
		const state = createState( { actions: { creating: { 1: true } } } );

		expect( isCreating( state, 1 ) ).toBe( true );
	} );

	it( 'returns false when not creating', () => {
		const state = createState( { actions: { creating: { 1: false } } } );

		expect( isCreating( state, 1 ) ).toBe( false );
	} );

	it( 'returns false for unknown ship', () => {
		const state = createState();

		expect( isCreating( state, 999 ) ).toBe( false );
	} );
} );

describe( 'getError', () => {
	it( 'returns the error when it exists', () => {
		const error = new HelmError( 'helm.test', 'Error' );
		const state = createState( { actions: { errors: { 1: error } } } );

		expect( getError( state, 1 ) ).toBe( error );
	} );

	it( 'returns null for unknown ship', () => {
		const state = createState();

		expect( getError( state, 999 ) ).toBeNull();
	} );
} );

describe( 'getCursor', () => {
	it( 'returns the cursor when set', () => {
		const state = createState( { meta: { cursor: '2025-06-01T00:00:00Z' } } );

		expect( getCursor( state ) ).toBe( '2025-06-01T00:00:00Z' );
	} );

	it( 'returns null when not set', () => {
		const state = createState();

		expect( getCursor( state ) ).toBeNull();
	} );
} );
