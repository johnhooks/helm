import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { getCurrentAction, isCreating, getError, getDraft, getCreateError, getCursor } from '../selectors';
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
	it( 'returns true when submitting', () => {
		const state = createState( { create: { isSubmitting: true } } );

		expect( isCreating( state ) ).toBe( true );
	} );

	it( 'returns false when not submitting', () => {
		const state = createState();

		expect( isCreating( state ) ).toBe( false );
	} );
} );

describe( 'getDraft', () => {
	it( 'returns the draft when isDraft is true', () => {
		const draft = { type: 'scan_route', params: { target_node_id: 5 } };
		const state = createState( { create: { action: draft, isDraft: true } } );

		expect( getDraft( state ) ).toEqual( draft );
	} );

	it( 'returns null when no draft', () => {
		const state = createState();

		expect( getDraft( state ) ).toBeNull();
	} );

	it( 'returns null when action exists but isDraft is false', () => {
		const action = { type: 'scan_route', params: {} };
		const state = createState( { create: { action, isDraft: false } } );

		expect( getDraft( state ) ).toBeNull();
	} );
} );

describe( 'getCreateError', () => {
	it( 'returns the error when set', () => {
		const error = new HelmError( 'helm.test', 'Error' );
		const state = createState( { create: { error } } );

		expect( getCreateError( state ) ).toBe( error );
	} );

	it( 'returns null when no error', () => {
		const state = createState();

		expect( getCreateError( state ) ).toBeNull();
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
