import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkRel } from '@helm/types';
import type { ApiNodeResponse } from '@helm/types';
import { ErrorCode, HelmError } from '@helm/errors';

vi.mock('@wordpress/api-fetch', () => ({ default: vi.fn() }));

import apiFetch from '@wordpress/api-fetch';
import { fetchAllNodes } from './fetch-nodes';

const mockApiFetch = vi.mocked(apiFetch);

function makeNode(id: number, stars?: ApiNodeResponse['_embedded']): ApiNodeResponse {
	return {
		id,
		type: 'system',
		x: id * 10,
		y: id * 20,
		z: id * 30,
		created_at: '2025-01-01T00:00:00',
		...(stars ? { _embedded: stars } : {}),
	};
}

function mockResponse(nodes: ApiNodeResponse[], totalPages: number): Response {
	return {
		headers: new Headers({ 'X-WP-TotalPages': String(totalPages) }),
		json: () => Promise.resolve(nodes),
	} as unknown as Response;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('fetchAllNodes', () => {
	it('fetches a single page of nodes', async () => {
		const nodes = [makeNode(1), makeNode(2)];
		mockApiFetch.mockResolvedValueOnce(mockResponse(nodes, 1));

		const result = await fetchAllNodes();

		expect(result).toEqual(nodes);
		expect(mockApiFetch).toHaveBeenCalledTimes(1);
		expect(mockApiFetch).toHaveBeenCalledWith({
			path: '/helm/v1/nodes?_embed=helm:stars&per_page=500&page=1',
			parse: false,
		});
	});

	it('fetches multiple pages sequentially', async () => {
		const page1 = [makeNode(1), makeNode(2)];
		const page2 = [makeNode(3)];

		mockApiFetch
			.mockResolvedValueOnce(mockResponse(page1, 2))
			.mockResolvedValueOnce(mockResponse(page2, 2));

		const result = await fetchAllNodes();

		expect(result).toEqual([...page1, ...page2]);
		expect(mockApiFetch).toHaveBeenCalledTimes(2);
		expect(mockApiFetch).toHaveBeenNthCalledWith(1, {
			path: '/helm/v1/nodes?_embed=helm:stars&per_page=500&page=1',
			parse: false,
		});
		expect(mockApiFetch).toHaveBeenNthCalledWith(2, {
			path: '/helm/v1/nodes?_embed=helm:stars&per_page=500&page=2',
			parse: false,
		});
	});

	it('returns empty array when API returns no nodes', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([], 1));

		const result = await fetchAllNodes();

		expect(result).toEqual([]);
	});

	it('preserves embedded stars in the response', async () => {
		const nodeWithStars = makeNode(1, {
			[ LinkRel.Stars ]: [
				{
					id: 10,
					title: 'Sol',
					node_id: 1,
					catalog_id: 'SOL-001',
					spectral_class: 'G2V',
					post_type: 'helm_star',
					x: 0,
					y: 0,
					z: 0,
					mass: 1.0,
					radius: 1.0,
					is_primary: true,
				},
			],
		});
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeWithStars], 1));

		const result = await fetchAllNodes();

		expect(result[0]._embedded?.[ LinkRel.Stars ]).toHaveLength(1);
		expect(result[0]._embedded?.[ LinkRel.Stars ]?.[0].title).toBe('Sol');
	});

	it('wraps fetch errors as CacheFetchFailed', async () => {
		mockApiFetch.mockRejectedValueOnce(new Error('Network timeout'));

		try {
			await fetchAllNodes();
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(HelmError.is(error)).toBe(true);
			const helmError = error as HelmError;
			expect(helmError.message).toBe(ErrorCode.CacheFetchFailed);
			expect(helmError.isSafe).toBe(true);
			expect(helmError.causes).toHaveLength(1);
			expect(helmError.causes[0].detail).toBe('Network timeout');
		}
	});

	it('wraps errors on subsequent pages as CacheFetchFailed', async () => {
		mockApiFetch
			.mockResolvedValueOnce(mockResponse([makeNode(1)], 2))
			.mockRejectedValueOnce(new Error('Connection reset'));

		try {
			await fetchAllNodes();
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(HelmError.is(error)).toBe(true);
			const helmError = error as HelmError;
			expect(helmError.message).toBe(ErrorCode.CacheFetchFailed);
			expect(helmError.causes[0].detail).toBe('Connection reset');
		}
	});
});
