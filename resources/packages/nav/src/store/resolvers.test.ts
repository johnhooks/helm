import { describe, expect, it, vi } from 'vitest';
import {
	findKnownPath,
	getStarNodes,
	getUserEdges,
	hasDirectEdgeBetween,
} from './resolvers';

describe('getStarNodes resolver', () => {
	it('refreshes stale user edges after cached hydrate', async () => {
		const dispatch = {
			hydrate: vi.fn().mockResolvedValue(undefined),
			syncUserEdgesIfStale: vi.fn().mockResolvedValue(undefined),
			syncNodes: vi.fn().mockResolvedValue(undefined),
		};
		const select = {
			getSyncStatus: vi.fn().mockReturnValueOnce('synced'),
		};

		await getStarNodes()({ dispatch, select } as never);

		expect(dispatch.hydrate).toHaveBeenCalledTimes(1);
		expect(dispatch.syncUserEdgesIfStale).toHaveBeenCalledTimes(1);
		expect(dispatch.syncNodes).not.toHaveBeenCalled();
	});

	it('runs full sync when hydrate finds no cached nav data', async () => {
		const dispatch = {
			hydrate: vi.fn().mockResolvedValue(undefined),
			syncUserEdgesIfStale: vi.fn().mockResolvedValue(undefined),
			syncNodes: vi.fn().mockResolvedValue(undefined),
		};
		const select = {
			getSyncStatus: vi.fn().mockReturnValueOnce('idle'),
		};

		await getStarNodes()({ dispatch, select } as never);

		expect(dispatch.syncUserEdgesIfStale).not.toHaveBeenCalled();
		expect(dispatch.syncNodes).toHaveBeenCalledTimes(1);
	});
});

describe('graph read resolvers', () => {
	it('reads user edges and endpoint nodes for route rendering', async () => {
		const userEdges = [
			{
				id: 7,
				node_a_id: 1,
				node_b_id: 2,
				distance: 1.5,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 8,
				node_a_id: 2,
				node_b_id: 3,
				distance: 2.5,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
		];
		const edgeNodes = [
			{ id: 1, type: 'system', x: 0, y: 0, z: 0, created_at: null },
			{ id: 2, type: 'waypoint', x: 1, y: 0, z: 0, created_at: null },
			{ id: 3, type: 'system', x: 2, y: 0, z: 0, created_at: null },
		];
		const dc = {
			getUserEdges: vi.fn().mockResolvedValue(userEdges),
			getNodes: vi.fn().mockResolvedValue(edgeNodes),
		};
		const dispatch = Object.assign(vi.fn(), {
			initialize: vi.fn().mockResolvedValue(dc),
		});

		await getUserEdges()({ dispatch } as never);

		expect(dc.getUserEdges).toHaveBeenCalledTimes(1);
		expect(dc.getNodes).toHaveBeenCalledWith([1, 2, 3]);
		expect(dispatch).toHaveBeenCalledWith({
			type: 'USER_EDGE_GRAPH_SYNC_FINISHED',
			userEdges,
			edgeNodes,
		});
	});

	it('reads direct edge state', async () => {
		const dc = {
			hasDirectEdgeBetween: vi.fn().mockResolvedValue(true),
		};
		const dispatch = Object.assign(vi.fn(), {
			initialize: vi.fn().mockResolvedValue(dc),
			receiveAdjacency: vi.fn(),
		});

		await hasDirectEdgeBetween(1, 2)({ dispatch } as never);

		expect(dc.hasDirectEdgeBetween).toHaveBeenCalledWith(1, 2);
		expect(dispatch.receiveAdjacency).toHaveBeenCalledWith(1, 2, true);
	});

	it('reads known path state', async () => {
		const path = {
			reachable: true,
			direct: false,
			nodeIds: [1, 4, 3],
			edgeIds: [7, 8],
			totalDistance: 3.5,
			nextNodeId: 4,
		};
		const dc = {
			findKnownPath: vi.fn().mockResolvedValue(path),
		};
		const dispatch = Object.assign(vi.fn(), {
			initialize: vi.fn().mockResolvedValue(dc),
		});

		await findKnownPath(1, 3)({ dispatch } as never);

		expect(dc.findKnownPath).toHaveBeenCalledWith(1, 3);
		expect(dispatch).toHaveBeenCalledWith({
			type: 'KNOWN_PATH_READ_FINISHED',
			key: '1:3',
			path,
		});
	});
});
