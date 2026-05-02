import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { ErrorCode, HelmError } from '@helm/errors';
import {
	fetchAllEdges,
	fetchEdgesByIds,
	fetchEdgeFreshness,
	getLastDiscoveredFromEdges,
} from './fetch-edges';

vi.mock('@wordpress/api-fetch', () => ({
	default: vi.fn(),
}));

type MockResponse = {
	headers: { get: (name: string) => string | null };
	json: () => Promise<unknown[]>;
};

function createResponse(totalPages: number, rows: unknown[]): MockResponse {
	return {
		headers: {
			get: (name: string) =>
				name === 'X-WP-TotalPages' ? String(totalPages) : null,
		},
		json: async () => rows,
	};
}

describe('fetchAllEdges', () => {
	beforeEach(() => {
		vi.mocked(apiFetch).mockReset();
	});

	it('fetches edge freshness from collection headers', async () => {
		vi.mocked(apiFetch).mockResolvedValueOnce(
			createResponse(1, []) as never
		);

		await expect(fetchEdgeFreshness()).resolves.toEqual({
			count: 0,
			lastDiscovered: '',
		});

		expect(vi.mocked(apiFetch)).toHaveBeenCalledWith({
			path: '/helm/v1/edges?per_page=1&page=1',
			method: 'HEAD',
			parse: false,
		});
	});

	it('reads populated freshness headers', async () => {
		vi.mocked(apiFetch).mockResolvedValueOnce({
			headers: {
				get: (name: string) => {
					if (name === 'X-WP-Total') {
						return '2';
					}
					if (name === 'X-Helm-Edge-Last-Discovered') {
						return '2026-04-22T00:00:00+00:00';
					}
					return null;
				},
			},
			json: async () => [],
		} as never);

		await expect(fetchEdgeFreshness()).resolves.toEqual({
			count: 2,
			lastDiscovered: '2026-04-22T00:00:00+00:00',
		});
	});

	it('fetches all pages sequentially', async () => {
		vi.mocked(apiFetch)
			.mockResolvedValueOnce(
				createResponse(2, [
					{
						id: 1,
						node_a_id: 10,
						node_b_id: 20,
						distance: 1.5,
						discovered_at: '2026-04-21T00:00:00Z',
					},
				]) as never
			)
			.mockResolvedValueOnce(
				createResponse(2, [
					{
						id: 2,
						node_a_id: 20,
						node_b_id: 30,
						distance: 2.5,
						discovered_at: '2026-04-22T00:00:00Z',
					},
				]) as never
			);

		await expect(fetchAllEdges()).resolves.toEqual([
			{
				id: 1,
				node_a_id: 10,
				node_b_id: 20,
				distance: 1.5,
				discovered_at: '2026-04-21T00:00:00Z',
			},
			{
				id: 2,
				node_a_id: 20,
				node_b_id: 30,
				distance: 2.5,
				discovered_at: '2026-04-22T00:00:00Z',
			},
		]);

		expect(vi.mocked(apiFetch)).toHaveBeenCalledTimes(2);
		expect(vi.mocked(apiFetch)).toHaveBeenNthCalledWith(1, {
			path: '/helm/v1/edges?per_page=500&page=1',
			parse: false,
		});
		expect(vi.mocked(apiFetch)).toHaveBeenNthCalledWith(2, {
			path: '/helm/v1/edges?per_page=500&page=2',
			parse: false,
		});
	});

	it('wraps fetch failures as CacheFetchFailed', async () => {
		vi.mocked(apiFetch).mockRejectedValueOnce(new Error('network down'));

		await expect(fetchAllEdges()).rejects.toMatchObject({
			message: ErrorCode.CacheFetchFailed,
		} satisfies Partial<HelmError>);
	});

	it('fetches unique edge ids in one request', async () => {
		const edges = [
			{
				id: 7,
				node_a_id: 10,
				node_b_id: 20,
				distance: 1.5,
				discovered_at: '2026-04-21T00:00:00Z',
			},
			{
				id: 8,
				node_a_id: 20,
				node_b_id: 30,
				distance: 2.5,
				discovered_at: '2026-04-22T00:00:00Z',
			},
		];
		vi.mocked(apiFetch).mockResolvedValueOnce({
			headers: {
				get: (name: string) => {
					if (name === 'X-WP-Total') {
						return '12';
					}
					if (name === 'X-Helm-Edge-Last-Discovered') {
						return '2026-04-22T00:00:00Z';
					}
					return null;
				},
			},
			json: async () => edges,
		} as never);

		await expect(fetchEdgesByIds([7, 8, 7])).resolves.toEqual({
			edges,
			freshness: {
				count: 12,
				lastDiscovered: '2026-04-22T00:00:00Z',
			},
		});

		expect(vi.mocked(apiFetch)).toHaveBeenCalledWith({
			path: '/helm/v1/edges?include=7,8',
			parse: false,
		});
	});

	it('returns empty targeted edges without a request when no ids are provided', async () => {
		await expect(fetchEdgesByIds([])).resolves.toEqual({
			edges: [],
			freshness: {
				count: 0,
				lastDiscovered: '',
			},
		});

		expect(vi.mocked(apiFetch)).not.toHaveBeenCalled();
	});

	it('returns the latest discovered timestamp from edge rows', () => {
		expect(
			getLastDiscoveredFromEdges([
				{
					id: 1,
					node_a_id: 10,
					node_b_id: 20,
					distance: 1.5,
					discovered_at: '2026-04-20T00:00:00+00:00',
				},
				{
					id: 2,
					node_a_id: 20,
					node_b_id: 30,
					distance: 2.5,
					discovered_at: '2026-04-22T00:00:00+00:00',
				},
				{
					id: 3,
					node_a_id: 30,
					node_b_id: 40,
					distance: 3.5,
					discovered_at: '2026-04-21T00:00:00+00:00',
				},
			])
		).toBe('2026-04-22T00:00:00+00:00');
	});
});
