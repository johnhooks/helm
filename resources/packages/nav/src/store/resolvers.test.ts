import { describe, expect, it, vi } from 'vitest';
import { getStarNodes } from './resolvers';

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
