import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { ErrorCode, HelmError } from '@helm/errors';
import { fetchAllEdges } from './fetch-edges';

vi.mock( '@wordpress/api-fetch', () => ( {
	default: vi.fn(),
} ) );

type MockResponse = {
	headers: { get: ( name: string ) => string | null };
	json: () => Promise< unknown[] >;
};

function createResponse( totalPages: number, rows: unknown[] ): MockResponse {
	return {
		headers: {
			get: ( name: string ) => name === 'X-WP-TotalPages' ? String( totalPages ) : null,
		},
		json: async () => rows,
	};
}

describe( 'fetchAllEdges', () => {
	beforeEach( () => {
		vi.mocked( apiFetch ).mockReset();
	} );

	it( 'fetches all pages sequentially', async () => {
		vi.mocked( apiFetch )
			.mockResolvedValueOnce(
				createResponse( 2, [
					{ id: 1, node_a_id: 10, node_b_id: 20, distance: 1.5, discovered_at: '2026-04-21T00:00:00Z' },
				] ) as never,
			)
			.mockResolvedValueOnce(
				createResponse( 2, [
					{ id: 2, node_a_id: 20, node_b_id: 30, distance: 2.5, discovered_at: '2026-04-22T00:00:00Z' },
				] ) as never,
			);

		await expect( fetchAllEdges() ).resolves.toEqual( [
			{ id: 1, node_a_id: 10, node_b_id: 20, distance: 1.5, discovered_at: '2026-04-21T00:00:00Z' },
			{ id: 2, node_a_id: 20, node_b_id: 30, distance: 2.5, discovered_at: '2026-04-22T00:00:00Z' },
		] );

		expect( vi.mocked( apiFetch ) ).toHaveBeenCalledTimes( 2 );
		expect( vi.mocked( apiFetch ) ).toHaveBeenNthCalledWith( 1, {
			path: '/helm/v1/edges?per_page=500&page=1',
			parse: false,
		} );
		expect( vi.mocked( apiFetch ) ).toHaveBeenNthCalledWith( 2, {
			path: '/helm/v1/edges?per_page=500&page=2',
			parse: false,
		} );
	} );

	it( 'wraps fetch failures as CacheFetchFailed', async () => {
		vi.mocked( apiFetch ).mockRejectedValueOnce( new Error( 'network down' ) );

		await expect( fetchAllEdges() ).rejects.toMatchObject( {
			message: ErrorCode.CacheFetchFailed,
		} satisfies Partial< HelmError > );
	} );
} );
