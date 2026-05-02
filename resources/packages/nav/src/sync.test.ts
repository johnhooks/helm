import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Datacore } from '@helm/datacore';
import {
	META_EDGE_LAST_DISCOVERED,
	syncNodes,
	syncUserEdgesByIds,
	syncUserEdgesIfStale,
} from './sync';
import { fetchAllNodes, fetchNodesByIds } from './fetch-nodes';
import {
	fetchAllEdges,
	fetchEdgesByIds,
	fetchEdgeFreshness,
} from './fetch-edges';

vi.mock('./fetch-nodes', () => ({
	fetchAllNodes: vi.fn(),
	fetchNodesByIds: vi.fn(),
}));

vi.mock('./fetch-edges', () => ({
	fetchAllEdges: vi.fn(),
	fetchEdgesByIds: vi.fn(),
	fetchEdgeFreshness: vi.fn(),
	getLastDiscoveredFromEdges: vi.fn(
		(edges: Array<{ discovered_at: string }>) =>
			edges.reduce(
				(latest, edge) =>
					edge.discovered_at > latest ? edge.discovered_at : latest,
				''
			)
	),
}));

function createDatacoreMock(): Datacore {
	const transaction: Datacore['transaction'] = async <T>(
		fn: () => Promise<T>
	) => fn();

	return {
		insertNode: vi.fn(),
		insertNodes: vi.fn(),
		clearNodes: vi.fn(),
		getNode: vi.fn(),
		getNodes: vi.fn(),
		insertStar: vi.fn(),
		insertStars: vi.fn(),
		clearStars: vi.fn(),
		getStarMap: vi.fn(),
		getStarsAtNode: vi.fn(),
		insertUserEdge: vi.fn(),
		insertUserEdges: vi.fn(),
		clearUserEdges: vi.fn(),
		getUserEdges: vi.fn(),
		getUserEdgesAtNode: vi.fn(),
		hasUserEdgesAtNode: vi.fn(),
		getConnectedNodeIds: vi.fn(),
		hasDirectEdgeBetween: vi.fn(),
		findKnownPath: vi.fn(),
		getMeta: vi.fn(),
		setMeta: vi.fn(),
		transaction: vi.fn(transaction) as Datacore['transaction'],
		close: vi.fn(),
	};
}

beforeEach(() => {
	vi.mocked(fetchAllNodes).mockReset();
	vi.mocked(fetchNodesByIds).mockReset();
	vi.mocked(fetchAllEdges).mockReset();
	vi.mocked(fetchEdgesByIds).mockReset();
	vi.mocked(fetchEdgeFreshness).mockReset();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-04-21T12:00:00Z'));
});

describe('syncUserEdgesByIds', () => {
	it('fetches targeted canonical edges and inserts missing nodes first', async () => {
		const dc = createDatacoreMock();
		vi.mocked(fetchEdgesByIds).mockResolvedValue({
			edges: [
				{
					id: 7,
					node_a_id: 10,
					node_b_id: 20,
					distance: 1.5,
					discovered_at: '2026-04-21T00:00:00+00:00',
				},
			],
			freshness: {
				count: 4,
				lastDiscovered: '2026-04-21T00:00:00+00:00',
			},
		});
		vi.mocked(dc.getNode)
			.mockResolvedValueOnce({
				id: 10,
				type: 'system',
				x: 0,
				y: 0,
				z: 0,
				created_at: null,
			})
			.mockResolvedValueOnce(null);
		vi.mocked(fetchNodesByIds).mockResolvedValue([
			{
				id: 20,
				type: 'waypoint',
				x: 1,
				y: 1,
				z: 1,
				created_at: '2026-04-20T00:00:00+00:00',
			},
		]);

		await expect(syncUserEdgesByIds(dc, [7])).resolves.toEqual({
			refreshed: true,
			edges: 4,
			lastDiscovered: '2026-04-21T00:00:00+00:00',
		});

		expect(fetchEdgesByIds).toHaveBeenCalledWith([7]);
		expect(fetchNodesByIds).toHaveBeenCalledWith([20]);
		expect(dc.clearUserEdges).not.toHaveBeenCalled();
		expect(dc.insertNodes).toHaveBeenCalledWith([
			{
				id: 20,
				type: 'waypoint',
				x: 1,
				y: 1,
				z: 1,
				created_at: '2026-04-20T00:00:00+00:00',
			},
		]);
		expect(dc.insertUserEdges).toHaveBeenCalledWith([
			{
				id: 7,
				node_a_id: 10,
				node_b_id: 20,
				distance: 1.5,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
		]);
		expect(dc.setMeta).toHaveBeenCalledWith('cache.edge_count', '4');
		expect(dc.setMeta).toHaveBeenCalledWith(
			META_EDGE_LAST_DISCOVERED,
			'2026-04-21T00:00:00+00:00'
		);
	});
});

describe('syncNodes', () => {
	it('clears and reloads nodes, stars, and user edges inside one transaction', async () => {
		const dc = createDatacoreMock();

		vi.mocked(fetchAllNodes).mockResolvedValue([
			{
				id: 1,
				type: 'system',
				x: 10,
				y: 20,
				z: 30,
				created_at: '2026-04-20T00:00:00Z',
				_embedded: {
					'helm:stars': [
						{
							id: 101,
							title: 'Sol',
							node_id: 1,
							catalog_id: 'SOL',
							spectral_class: 'G',
							post_type: 'helm_star',
							x: 10,
							y: 20,
							z: 30,
							mass: 1,
							radius: 1,
							is_primary: true,
						},
					],
				},
			},
		]);
		vi.mocked(fetchAllEdges).mockResolvedValue([
			{
				id: 201,
				node_a_id: 1,
				node_b_id: 2,
				distance: 4.5,
				discovered_at: '2026-04-21T00:00:00Z',
			},
		]);

		await expect(syncNodes(dc)).resolves.toEqual({
			nodes: 1,
			stars: 1,
			waypoints: 0,
			edges: 1,
			syncedAt: '2026-04-21T12:00:00.000Z',
		});

		expect(dc.transaction).toHaveBeenCalledTimes(1);
		expect(dc.clearUserEdges).toHaveBeenCalledTimes(1);
		expect(dc.clearStars).toHaveBeenCalledTimes(1);
		expect(dc.clearNodes).toHaveBeenCalledTimes(1);
		expect(dc.insertNodes).toHaveBeenCalledWith([
			{
				id: 1,
				type: 'system',
				x: 10,
				y: 20,
				z: 30,
				created_at: '2026-04-20T00:00:00Z',
			},
		]);
		expect(dc.insertStars).toHaveBeenCalledTimes(1);
		expect(dc.insertUserEdges).toHaveBeenCalledWith([
			{
				id: 201,
				node_a_id: 1,
				node_b_id: 2,
				distance: 4.5,
				discovered_at: '2026-04-21T00:00:00Z',
			},
		]);
		expect(dc.setMeta).toHaveBeenCalledWith(
			'cache.synced_at',
			'2026-04-21T12:00:00.000Z'
		);
		expect(dc.setMeta).toHaveBeenCalledWith('cache.node_count', '1');
		expect(dc.setMeta).toHaveBeenCalledWith('cache.star_count', '1');
		expect(dc.setMeta).toHaveBeenCalledWith('cache.waypoint_count', '0');
		expect(dc.setMeta).toHaveBeenCalledWith('cache.edge_count', '1');
		expect(dc.setMeta).toHaveBeenCalledWith(
			META_EDGE_LAST_DISCOVERED,
			'2026-04-21T00:00:00Z'
		);
	});

	it('does not mutate datacore when edge fetch fails before the transaction', async () => {
		const dc = createDatacoreMock();

		vi.mocked(fetchAllNodes).mockResolvedValue([]);
		vi.mocked(fetchAllEdges).mockRejectedValue(
			new Error('edge fetch failed')
		);

		await expect(syncNodes(dc)).rejects.toThrow('edge fetch failed');

		expect(dc.transaction).not.toHaveBeenCalled();
		expect(dc.clearUserEdges).not.toHaveBeenCalled();
		expect(dc.clearStars).not.toHaveBeenCalled();
		expect(dc.clearNodes).not.toHaveBeenCalled();
	});
});

describe('syncUserEdgesIfStale', () => {
	it('does not reload edges when local and server freshness match', async () => {
		const dc = createDatacoreMock();
		vi.mocked(dc.getMeta)
			.mockResolvedValueOnce('2')
			.mockResolvedValueOnce('2026-04-22T00:00:00+00:00');
		vi.mocked(fetchEdgeFreshness).mockResolvedValue({
			count: 2,
			lastDiscovered: '2026-04-22T00:00:00+00:00',
		});

		await expect(syncUserEdgesIfStale(dc)).resolves.toEqual({
			refreshed: false,
			edges: 2,
			lastDiscovered: '2026-04-22T00:00:00+00:00',
		});

		expect(fetchAllEdges).not.toHaveBeenCalled();
		expect(fetchNodesByIds).not.toHaveBeenCalled();
		expect(dc.transaction).not.toHaveBeenCalled();
	});

	it('full-replaces user edges when count differs', async () => {
		const dc = createDatacoreMock();
		vi.mocked(dc.getMeta)
			.mockResolvedValueOnce('1')
			.mockResolvedValueOnce('2026-04-21T00:00:00+00:00');
		vi.mocked(fetchEdgeFreshness).mockResolvedValue({
			count: 2,
			lastDiscovered: '2026-04-21T00:00:00+00:00',
		});
		vi.mocked(fetchAllEdges).mockResolvedValue([
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
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
		]);
		vi.mocked(dc.getNode)
			.mockResolvedValueOnce({
				id: 10,
				type: 'system',
				x: 0,
				y: 0,
				z: 0,
				created_at: null,
			})
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null);
		vi.mocked(fetchNodesByIds).mockResolvedValue([
			{
				id: 20,
				type: 'waypoint',
				x: 1,
				y: 1,
				z: 1,
				created_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 30,
				type: 'system',
				x: 2,
				y: 2,
				z: 2,
				created_at: '2026-04-20T00:00:00+00:00',
			},
		]);

		await expect(syncUserEdgesIfStale(dc)).resolves.toEqual({
			refreshed: true,
			edges: 2,
			lastDiscovered: '2026-04-21T00:00:00+00:00',
		});

		expect(dc.clearUserEdges).toHaveBeenCalledTimes(1);
		expect(fetchNodesByIds).toHaveBeenCalledWith([20, 30]);
		expect(dc.insertNodes).toHaveBeenCalledWith([
			{
				id: 20,
				type: 'waypoint',
				x: 1,
				y: 1,
				z: 1,
				created_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 30,
				type: 'system',
				x: 2,
				y: 2,
				z: 2,
				created_at: '2026-04-20T00:00:00+00:00',
			},
		]);
		expect(dc.insertUserEdges).toHaveBeenCalledTimes(1);
		expect(dc.setMeta).toHaveBeenCalledWith('cache.edge_count', '2');
		expect(dc.setMeta).toHaveBeenCalledWith(
			META_EDGE_LAST_DISCOVERED,
			'2026-04-21T00:00:00+00:00'
		);
	});

	it('full-replaces user edges when last discovery differs', async () => {
		const dc = createDatacoreMock();
		vi.mocked(dc.getMeta)
			.mockResolvedValueOnce('1')
			.mockResolvedValueOnce('2026-04-20T00:00:00+00:00');
		vi.mocked(fetchEdgeFreshness).mockResolvedValue({
			count: 1,
			lastDiscovered: '2026-04-21T00:00:00+00:00',
		});
		vi.mocked(fetchAllEdges).mockResolvedValue([
			{
				id: 1,
				node_a_id: 10,
				node_b_id: 20,
				distance: 1.5,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
		]);
		vi.mocked(dc.getNode)
			.mockResolvedValueOnce({
				id: 10,
				type: 'system',
				x: 0,
				y: 0,
				z: 0,
				created_at: null,
			})
			.mockResolvedValueOnce({
				id: 20,
				type: 'system',
				x: 1,
				y: 1,
				z: 1,
				created_at: null,
			});
		vi.mocked(fetchNodesByIds).mockResolvedValue([]);

		await expect(syncUserEdgesIfStale(dc)).resolves.toMatchObject({
			refreshed: true,
			edges: 1,
		});

		expect(dc.clearUserEdges).toHaveBeenCalledTimes(1);
		expect(fetchNodesByIds).toHaveBeenCalledWith([]);
		expect(dc.insertUserEdges).toHaveBeenCalledWith([
			{
				id: 1,
				node_a_id: 10,
				node_b_id: 20,
				distance: 1.5,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
		]);
	});
});
