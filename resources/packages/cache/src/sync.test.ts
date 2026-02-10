import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Datacore } from '@helm/datacore';
import { ErrorCode, HelmError } from '@helm/errors';
import { META_NODE_COUNT, META_STAR_COUNT, META_SYNCED_AT } from './types';

vi.mock('@wordpress/api-fetch', () => ({ default: vi.fn() }));

import apiFetch from '@wordpress/api-fetch';
import { syncNodes } from './sync';

const mockApiFetch = vi.mocked(apiFetch);

function mockResponse(nodes: unknown[], totalPages: number): Response {
	return {
		headers: new Headers({ 'X-WP-TotalPages': String(totalPages) }),
		json: () => Promise.resolve(nodes),
	} as unknown as Response;
}

function createMockDatacore(): Datacore {
	return {
		insertNode: vi.fn(),
		insertNodes: vi.fn(),
		insertStar: vi.fn(),
		insertStars: vi.fn(),
		clearNodes: vi.fn(),
		clearStars: vi.fn(),
		getStarMap: vi.fn(),

		getStarsAtNode: vi.fn(),
		getNode: vi.fn(),
		getMeta: vi.fn(),
		setMeta: vi.fn(),
		transaction: vi.fn((fn) => fn()) as Datacore['transaction'],
		close: vi.fn(),
	};
}

const nodeA = {
	id: 1,
	type: 'system',
	x: 10,
	y: 20,
	z: 30,
	created_at: '2025-01-01T00:00:00',
	_embedded: {
		'helm:stars': [
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
			{
				id: 11,
				title: 'Proxima',
				node_id: 1,
				catalog_id: 'PRX-001',
				spectral_class: 'M5V',
				post_type: 'helm_star',
				x: 1,
				y: 1,
				z: 1,
				mass: 0.12,
				radius: 0.15,
				is_primary: false,
			},
		],
	},
};

const nodeB = {
	id: 2,
	type: 'nebula',
	x: 100,
	y: 200,
	z: 300,
	created_at: null,
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
});

describe('syncNodes', () => {
	it('syncs nodes and stars from API to datacore', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeA, nodeB], 1));
		const datacore = createMockDatacore();

		const result = await syncNodes(datacore);

		expect(result).toEqual({
			nodes: 2,
			stars: 2,
			syncedAt: '2025-06-15T12:00:00.000Z',
		});
	});

	it('bulk inserts all nodes and stars', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeA, nodeB], 1));
		const datacore = createMockDatacore();

		await syncNodes(datacore);

		expect(datacore.insertNodes).toHaveBeenCalledOnce();
		expect(datacore.insertNodes).toHaveBeenCalledWith([
			{ id: 1, type: 'system', x: 10, y: 20, z: 30, created_at: '2025-01-01T00:00:00' },
			{ id: 2, type: 'nebula', x: 100, y: 200, z: 300, created_at: null },
		]);

		expect(datacore.insertStars).toHaveBeenCalledOnce();
		expect(datacore.insertStars).toHaveBeenCalledWith(nodeA._embedded['helm:stars']);
	});

	it('runs all writes inside a transaction', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeA], 1));
		const datacore = createMockDatacore();
		let transactionCalled = false;
		vi.mocked(datacore.transaction).mockImplementation(async (fn) => {
			transactionCalled = true;
			return fn();
		});

		await syncNodes(datacore);

		expect(transactionCalled).toBe(true);
		expect(datacore.clearStars).toHaveBeenCalled();
		expect(datacore.clearNodes).toHaveBeenCalled();
		expect(datacore.insertNodes).toHaveBeenCalled();
		expect(datacore.insertStars).toHaveBeenCalled();
		expect(datacore.setMeta).toHaveBeenCalled();
	});

	it('strips _embedded when inserting nodes', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeA], 1));
		const datacore = createMockDatacore();

		await syncNodes(datacore);

		const insertedNodes = vi.mocked(datacore.insertNodes).mock.calls[0][0];
		expect(insertedNodes[0]).toEqual({
			id: 1,
			type: 'system',
			x: 10,
			y: 20,
			z: 30,
			created_at: '2025-01-01T00:00:00',
		});
		expect(insertedNodes[0]).not.toHaveProperty('_embedded');
	});

	it('handles nodes without embedded stars', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeB], 1));
		const datacore = createMockDatacore();

		const result = await syncNodes(datacore);

		expect(result.nodes).toBe(1);
		expect(result.stars).toBe(0);
		expect(datacore.insertStars).toHaveBeenCalledWith([]);
	});

	it('writes sync metadata', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeA, nodeB], 1));
		const datacore = createMockDatacore();

		await syncNodes(datacore);

		expect(datacore.setMeta).toHaveBeenCalledWith(META_SYNCED_AT, '2025-06-15T12:00:00.000Z');
		expect(datacore.setMeta).toHaveBeenCalledWith(META_NODE_COUNT, '2');
		expect(datacore.setMeta).toHaveBeenCalledWith(META_STAR_COUNT, '2');
	});

	it('handles empty API response', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([], 1));
		const datacore = createMockDatacore();

		const result = await syncNodes(datacore);

		expect(result.nodes).toBe(0);
		expect(result.stars).toBe(0);
		expect(datacore.clearStars).toHaveBeenCalled();
		expect(datacore.clearNodes).toHaveBeenCalled();
		expect(datacore.insertNodes).toHaveBeenCalledWith([]);
		expect(datacore.insertStars).toHaveBeenCalledWith([]);
	});

	it('rethrows CacheFetchFailed from fetch errors (cache untouched)', async () => {
		mockApiFetch.mockRejectedValueOnce(new Error('Server error'));
		const datacore = createMockDatacore();

		try {
			await syncNodes(datacore);
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(HelmError.is(error)).toBe(true);
			const helmError = error as HelmError;
			expect(helmError.message).toBe(ErrorCode.CacheFetchFailed);
		}

		// Cache should be untouched — no writes happened.
		expect(datacore.transaction).not.toHaveBeenCalled();
	});

	it('wraps datacore errors as CacheSyncFailed', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeA], 1));
		const datacore = createMockDatacore();
		vi.mocked(datacore.clearStars).mockRejectedValueOnce(new Error('SQLITE_FULL'));

		try {
			await syncNodes(datacore);
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(HelmError.is(error)).toBe(true);
			const helmError = error as HelmError;
			expect(helmError.message).toBe(ErrorCode.CacheSyncFailed);
			expect(helmError.isSafe).toBe(true);
			expect(helmError.causes).toHaveLength(1);
			expect(helmError.causes[0].detail).toBe('SQLITE_FULL');
		}
	});

	it('rethrows HelmError from datacore without wrapping', async () => {
		mockApiFetch.mockResolvedValueOnce(mockResponse([nodeA], 1));
		const datacore = createMockDatacore();
		const original = new HelmError('helm.datacore.worker_error', 'Worker died');
		vi.mocked(datacore.clearStars).mockRejectedValueOnce(original);

		try {
			await syncNodes(datacore);
			expect.unreachable('Should have thrown');
		} catch (error) {
			expect(error).toBe(original);
		}
	});
});
