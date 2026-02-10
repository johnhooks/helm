import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Datacore } from '@helm/datacore';
import { META_SYNCED_AT } from './types';

vi.mock('@wordpress/api-fetch', () => ({ default: vi.fn() }));
vi.mock('./sync', () => ({
	syncNodes: vi.fn(),
}));

import { syncNodes } from './sync';
import { createCache } from './cache';

const mockSyncNodes = vi.mocked(syncNodes);

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

beforeEach(() => {
	vi.clearAllMocks();
});

describe('createCache', () => {
	it('returns a Cache instance', () => {
		const cache = createCache({ datacore: createMockDatacore() });

		expect(cache.syncNodes).toBeInstanceOf(Function);
		expect(cache.lastSyncedAt).toBeInstanceOf(Function);
		expect(cache.isSynced).toBeInstanceOf(Function);
	});

	describe('syncNodes', () => {
		it('delegates to the sync module with the bound datacore', async () => {
			const datacore = createMockDatacore();
			const cache = createCache({ datacore });
			const result = { nodes: 5, stars: 3, syncedAt: '2025-01-01T00:00:00.000Z' };
			mockSyncNodes.mockResolvedValueOnce(result);

			const actual = await cache.syncNodes();

			expect(actual).toBe(result);
			expect(mockSyncNodes).toHaveBeenCalledWith(datacore);
		});
	});

	describe('lastSyncedAt', () => {
		it('returns the synced_at timestamp from meta', async () => {
			const datacore = createMockDatacore();
			vi.mocked(datacore.getMeta).mockResolvedValueOnce('2025-06-15T12:00:00.000Z');
			const cache = createCache({ datacore });

			const result = await cache.lastSyncedAt();

			expect(result).toBe('2025-06-15T12:00:00.000Z');
			expect(datacore.getMeta).toHaveBeenCalledWith(META_SYNCED_AT);
		});

		it('returns null when never synced', async () => {
			const datacore = createMockDatacore();
			vi.mocked(datacore.getMeta).mockResolvedValueOnce(null);
			const cache = createCache({ datacore });

			const result = await cache.lastSyncedAt();

			expect(result).toBeNull();
		});
	});

	describe('isSynced', () => {
		it('returns true when synced_at exists', async () => {
			const datacore = createMockDatacore();
			vi.mocked(datacore.getMeta).mockResolvedValueOnce('2025-06-15T12:00:00.000Z');
			const cache = createCache({ datacore });

			expect(await cache.isSynced()).toBe(true);
		});

		it('returns false when never synced', async () => {
			const datacore = createMockDatacore();
			vi.mocked(datacore.getMeta).mockResolvedValueOnce(null);
			const cache = createCache({ datacore });

			expect(await cache.isSynced()).toBe(false);
		});
	});
});
