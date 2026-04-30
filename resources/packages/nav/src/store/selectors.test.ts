import { describe, expect, it } from 'vitest';
import { initializeDefaultState, reducer } from './reducer';
import { findKnownPath, hasDirectEdgeBetween } from './selectors';

describe( 'graph selectors', () => {
	it( 'returns undefined before a direct edge read resolves', () => {
		const state = initializeDefaultState();

		expect( hasDirectEdgeBetween( state, 1, 2 ) ).toBeUndefined();
	} );

	it( 'returns cached direct edge results', () => {
		const state = reducer( initializeDefaultState(), {
			type: 'DIRECT_EDGE_READ_FINISHED',
			key: '1:2',
			hasDirectEdge: true,
		} );

		expect( hasDirectEdgeBetween( state, 1, 2 ) ).toBe( true );
	} );

	it( 'returns cached known path results', () => {
		const path = {
			reachable: true,
			direct: false,
			nodeIds: [ 1, 4, 2 ],
			edgeIds: [ 7, 8 ],
			totalDistance: 3.5,
			nextNodeId: 4,
		};
		const state = reducer( initializeDefaultState(), {
			type: 'KNOWN_PATH_READ_FINISHED',
			key: '1:2',
			path,
		} );

		expect( findKnownPath( state, 1, 2 ) ).toEqual( path );
	} );
} );
