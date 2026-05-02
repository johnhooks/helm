import { describe, expect, it } from 'vitest';
import { initializeDefaultState, reducer } from './reducer';
import {
	findKnownPath,
	getEdgeNodes,
	getUserEdges,
	hasDirectEdgeBetween,
} from './selectors';

describe('graph selectors', () => {
	it('returns undefined before a direct edge read resolves', () => {
		const state = initializeDefaultState();

		expect(hasDirectEdgeBetween(state, 1, 2)).toBeUndefined();
	});

	it('returns cached direct edge results', () => {
		const state = reducer(initializeDefaultState(), {
			type: 'RECEIVE_ADJACENCY',
			key: '1:2',
			adjacent: true,
		});

		expect(hasDirectEdgeBetween(state, 1, 2)).toBe(true);
	});

	it('returns cached known path results', () => {
		const path = {
			reachable: true,
			direct: false,
			nodeIds: [1, 4, 2],
			edgeIds: [7, 8],
			totalDistance: 3.5,
			nextNodeId: 4,
		};
		const state = reducer(initializeDefaultState(), {
			type: 'KNOWN_PATH_READ_FINISHED',
			key: '1:2',
			path,
		});

		expect(findKnownPath(state, 1, 2)).toEqual(path);
	});

	it('returns cached user edges and endpoint nodes', () => {
		const userEdges = [
			{
				id: 7,
				node_a_id: 1,
				node_b_id: 2,
				distance: 1.5,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
		];
		const edgeNodes = [
			{ id: 1, type: 'system', x: 0, y: 0, z: 0, created_at: null },
			{ id: 2, type: 'waypoint', x: 1, y: 0, z: 0, created_at: null },
		];
		const state = reducer(initializeDefaultState(), {
			type: 'USER_EDGE_GRAPH_SYNC_FINISHED',
			userEdges,
			edgeNodes,
		});

		expect(getUserEdges(state)).toEqual(userEdges);
		expect(getEdgeNodes(state)).toEqual(edgeNodes);
	});
});
