import { describe, expect, it, vi } from 'vitest';
import { findKnownPath, getStarNodes, hasDirectEdgeBetween } from './resolvers';

describe( 'getStarNodes resolver', () => {
	it( 'refreshes stale user edges after cached hydrate', async () => {
		const dispatch = {
			hydrate: vi.fn().mockResolvedValue( undefined ),
			syncUserEdgesIfStale: vi.fn().mockResolvedValue( undefined ),
			syncNodes: vi.fn().mockResolvedValue( undefined ),
		};
		const select = {
			getSyncStatus: vi.fn()
				.mockReturnValueOnce( 'idle' )
				.mockReturnValueOnce( 'synced' ),
		};

		await getStarNodes()( { dispatch, select } as never );

		expect( dispatch.hydrate ).toHaveBeenCalledTimes( 1 );
		expect( dispatch.syncUserEdgesIfStale ).toHaveBeenCalledTimes( 1 );
		expect( dispatch.syncNodes ).not.toHaveBeenCalled();
	} );

	it( 'runs full sync when hydrate finds no cached nav data', async () => {
		const dispatch = {
			hydrate: vi.fn().mockResolvedValue( undefined ),
			syncUserEdgesIfStale: vi.fn().mockResolvedValue( undefined ),
			syncNodes: vi.fn().mockResolvedValue( undefined ),
		};
		const select = {
			getSyncStatus: vi.fn()
				.mockReturnValueOnce( 'idle' )
				.mockReturnValueOnce( 'idle' ),
		};

		await getStarNodes()( { dispatch, select } as never );

		expect( dispatch.syncUserEdgesIfStale ).not.toHaveBeenCalled();
		expect( dispatch.syncNodes ).toHaveBeenCalledTimes( 1 );
	} );
} );

describe( 'graph read resolvers', () => {
	it( 'reads direct edge state when the selector has not resolved', async () => {
		const dc = {
			hasDirectEdgeBetween: vi.fn().mockResolvedValue( true ),
		};
		const dispatch = Object.assign( vi.fn(), {
			initialize: vi.fn().mockResolvedValue( dc ),
		} );
		const select = {
			hasDirectEdgeBetween: vi.fn().mockReturnValue( undefined ),
		};

		await hasDirectEdgeBetween( 1, 2 )( { dispatch, select } as never );

		expect( dc.hasDirectEdgeBetween ).toHaveBeenCalledWith( 1, 2 );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'DIRECT_EDGE_READ_FINISHED',
			key: '1:2',
			hasDirectEdge: true,
		} );
	} );

	it( 'skips direct edge read when the selector already has a value', async () => {
		const dispatch = Object.assign( vi.fn(), {
			initialize: vi.fn(),
		} );
		const select = {
			hasDirectEdgeBetween: vi.fn().mockReturnValue( false ),
		};

		await hasDirectEdgeBetween( 1, 2 )( { dispatch, select } as never );

		expect( dispatch.initialize ).not.toHaveBeenCalled();
	} );

	it( 'reads known path state when the selector has not resolved', async () => {
		const path = {
			reachable: true,
			direct: false,
			nodeIds: [ 1, 4, 3 ],
			edgeIds: [ 7, 8 ],
			totalDistance: 3.5,
			nextNodeId: 4,
		};
		const dc = {
			findKnownPath: vi.fn().mockResolvedValue( path ),
		};
		const dispatch = Object.assign( vi.fn(), {
			initialize: vi.fn().mockResolvedValue( dc ),
		} );
		const select = {
			findKnownPath: vi.fn().mockReturnValue( undefined ),
		};

		await findKnownPath( 1, 3 )( { dispatch, select } as never );

		expect( dc.findKnownPath ).toHaveBeenCalledWith( 1, 3 );
		expect( dispatch ).toHaveBeenCalledWith( {
			type: 'KNOWN_PATH_READ_FINISHED',
			key: '1:3',
			path,
		} );
	} );
} );
