import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { ErrorCode, HelmError } from '@helm/errors';
import { fetchNodesByIds } from './fetch-nodes';

vi.mock('@wordpress/api-fetch', () => ({
	default: vi.fn(),
}));

describe('fetchNodesByIds', () => {
	beforeEach(() => {
		vi.mocked(apiFetch).mockReset();
	});

	it('returns empty without a request when no ids are provided', async () => {
		await expect(fetchNodesByIds([])).resolves.toEqual([]);

		expect(apiFetch).not.toHaveBeenCalled();
	});

	it('fetches unique node ids in one request', async () => {
		const nodes = [
			{
				id: 10,
				type: 'system',
				x: 0,
				y: 0,
				z: 0,
				created_at: '2026-04-20T00:00:00Z',
			},
			{
				id: 20,
				type: 'waypoint',
				x: 1,
				y: 1,
				z: 1,
				created_at: '2026-04-21T00:00:00Z',
			},
		];
		vi.mocked(apiFetch).mockResolvedValueOnce(nodes as never);

		await expect(fetchNodesByIds([10, 20, 10])).resolves.toEqual(nodes);

		expect(apiFetch).toHaveBeenCalledWith({
			path: '/helm/v1/nodes?include=10,20',
		});
	});

	it('wraps fetch failures as CacheFetchFailed', async () => {
		vi.mocked(apiFetch).mockRejectedValueOnce(new Error('network down'));

		await expect(fetchNodesByIds([10])).rejects.toMatchObject({
			message: ErrorCode.CacheFetchFailed,
		} satisfies Partial<HelmError>);
	});
});
