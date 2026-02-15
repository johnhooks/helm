import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { getAction, getActions, getLatestAction, isCreating, getDraft, getCreateError, getHeartbeatCursor, canLoadMore, isLoading, isLoadingAction, getActionError, getQueryMeta } from '../selectors';
import { createShipAction, createState } from './fixtures';

describe( 'getActions', () => {
	it( 'returns actions in query order', () => {
		const a1 = createShipAction( { id: 10 } );
		const a2 = createShipAction( { id: 9 } );
		const state = createState( {
			actions: {
				byId: { 10: a1, 9: a2 },
				queries: { '/helm/v1/ships/1/actions': [ 10, 9 ] },
			},
		} );

		expect( getActions( state, 1 ) ).toEqual( [ a1, a2 ] );
	} );

	it( 'returns empty array for unknown ship', () => {
		const state = createState();

		expect( getActions( state, 999 ) ).toEqual( [] );
	} );
} );

describe( 'getAction', () => {
	it( 'returns action by id', () => {
		const action = createShipAction( { id: 42 } );
		const state = createState( {
			actions: { byId: { 42: action } },
		} );

		expect( getAction( state, 42 ) ).toBe( action );
	} );

	it( 'returns null for unknown id', () => {
		const state = createState();

		expect( getAction( state, 999 ) ).toBeNull();
	} );
} );

describe( 'getLatestAction', () => {
	it( 'returns the action with the highest id', () => {
		const older = createShipAction( { id: 2, status: 'fulfilled' } );
		const newer = createShipAction( { id: 5, status: 'pending' } );
		const state = createState( {
			actions: {
				byId: { 2: older, 5: newer },
			},
		} );

		expect( getLatestAction( state ) ).toBe( newer );
	} );

	it( 'filters by type when provided', () => {
		const scan = createShipAction( { id: 3, type: 'scan_route' } );
		const jump = createShipAction( { id: 5, type: 'jump' } );
		const state = createState( {
			actions: {
				byId: { 3: scan, 5: jump },
			},
		} );

		expect( getLatestAction( state, 'scan_route' ) ).toBe( scan );
		expect( getLatestAction( state, 'jump' ) ).toBe( jump );
	} );

	it( 'returns the latest of the filtered type', () => {
		const oldScan = createShipAction( { id: 1, type: 'scan_route' } );
		const newScan = createShipAction( { id: 4, type: 'scan_route' } );
		const jump = createShipAction( { id: 5, type: 'jump' } );
		const state = createState( {
			actions: {
				byId: { 1: oldScan, 4: newScan, 5: jump },
			},
		} );

		expect( getLatestAction( state, 'scan_route' ) ).toBe( newScan );
	} );

	it( 'returns null when no actions match type', () => {
		const scan = createShipAction( { id: 1, type: 'scan_route' } );
		const state = createState( {
			actions: {
				byId: { 1: scan },
			},
		} );

		expect( getLatestAction( state, 'jump' ) ).toBeNull();
	} );

	it( 'returns null with empty state', () => {
		const state = createState();

		expect( getLatestAction( state ) ).toBeNull();
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
		const draft = { type: 'scan_route' as const, params: { target_node_id: 5 } };
		const state = createState( { create: { action: draft, isDraft: true } } );

		expect( getDraft( state ) ).toEqual( draft );
	} );

	it( 'returns null when no draft', () => {
		const state = createState();

		expect( getDraft( state ) ).toBeNull();
	} );

	it( 'returns null when action exists but isDraft is false', () => {
		const action = { type: 'scan_route' as const, params: {} };
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

describe( 'isLoadingAction', () => {
	it( 'returns true when action is loading', () => {
		const state = createState( { actions: { isLoading: { 42: true } } } );

		expect( isLoadingAction( state, 42 ) ).toBe( true );
	} );

	it( 'returns false when action is not loading', () => {
		const state = createState();

		expect( isLoadingAction( state, 42 ) ).toBe( false );
	} );
} );

describe( 'getActionError', () => {
	it( 'returns the error when set', () => {
		const error = new HelmError( 'helm.test', 'Error' );
		const state = createState( { actions: { error: { 42: error } } } );

		expect( getActionError( state, 42 ) ).toBe( error );
	} );

	it( 'returns null when no error', () => {
		const state = createState();

		expect( getActionError( state, 42 ) ).toBeNull();
	} );
} );

describe( 'getHeartbeatCursor', () => {
	it( 'returns the cursor when set', () => {
		const state = createState( { heartbeat: { cursor: '2025-06-01T00:00:00Z' } } );

		expect( getHeartbeatCursor( state ) ).toBe( '2025-06-01T00:00:00Z' );
	} );

	it( 'returns null when not set', () => {
		const state = createState();

		expect( getHeartbeatCursor( state ) ).toBeNull();
	} );
} );

describe( 'getQueryMeta', () => {
	it( 'returns meta for existing query', () => {
		const meta = { next: 'http://test/next', isLoading: false, error: null };
		const state = createState( {
			actions: { meta: { '/helm/v1/ships/1/actions': meta } },
		} );

		expect( getQueryMeta( state, 1 ) ).toEqual( meta );
	} );

	it( 'returns null for unknown ship', () => {
		const state = createState();

		expect( getQueryMeta( state, 999 ) ).toBeNull();
	} );
} );

describe( 'canLoadMore', () => {
	it( 'returns true when next URL exists', () => {
		const state = createState( {
			actions: {
				meta: { '/helm/v1/ships/1/actions': { next: 'http://test/next', isLoading: false, error: null } },
			},
		} );

		expect( canLoadMore( state, 1 ) ).toBe( true );
	} );

	it( 'returns false when next is null', () => {
		const state = createState( {
			actions: {
				meta: { '/helm/v1/ships/1/actions': { next: null, isLoading: false, error: null } },
			},
		} );

		expect( canLoadMore( state, 1 ) ).toBe( false );
	} );

	it( 'returns false for unknown ship', () => {
		const state = createState();

		expect( canLoadMore( state, 999 ) ).toBe( false );
	} );
} );

describe( 'isLoading', () => {
	it( 'returns true when loading', () => {
		const state = createState( {
			actions: {
				meta: { '/helm/v1/ships/1/actions': { next: null, isLoading: true, error: null } },
			},
		} );

		expect( isLoading( state, 1 ) ).toBe( true );
	} );

	it( 'returns false when not loading', () => {
		const state = createState( {
			actions: {
				meta: { '/helm/v1/ships/1/actions': { next: null, isLoading: false, error: null } },
			},
		} );

		expect( isLoading( state, 1 ) ).toBe( false );
	} );

	it( 'returns false for unknown ship', () => {
		const state = createState();

		expect( isLoading( state, 999 ) ).toBe( false );
	} );
} );
