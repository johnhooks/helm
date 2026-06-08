import { describe, expect, it } from 'vitest';
import { initializeDefaultState, reducer } from './reducer';
import {
	findKnownPath,
	getEdgeNodes,
	getKnownPathNodeNames,
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

	it('returns stable known path node names', () => {
		const path = {
			reachable: true,
			direct: false,
			nodeIds: [1, 4, 2],
			edgeIds: [7, 8],
			totalDistance: 3.5,
			nextNodeId: 4,
		};
		let state = reducer(initializeDefaultState(), {
			type: 'KNOWN_PATH_READ_FINISHED',
			key: '1:2',
			path,
		});
		state = reducer(state, {
			type: 'SYNC_FINISHED',
			nodes: [
				{
					id: 10,
					node_id: 1,
					title: 'Sol',
					catalog_id: 'SOL',
					spectral_class: 'G2V',
					x: 0,
					y: 0,
					z: 0,
					mass: null,
					radius: null,
					node_type: 'system',
				},
				{
					id: 20,
					node_id: 2,
					title: 'Vega',
					catalog_id: 'VEGA',
					spectral_class: 'A0V',
					x: 2,
					y: 0,
					z: 0,
					mass: null,
					radius: null,
					node_type: 'system',
				},
			],
			syncResult: {
				nodes: 3,
				stars: 2,
				waypoints: 1,
				edges: 2,
				syncedAt: '2026-06-08T00:00:00+00:00',
			},
		});
		state = reducer(state, {
			type: 'USER_EDGE_GRAPH_SYNC_FINISHED',
			userEdges: [],
			edgeNodes: [
				{ id: 4, type: 'waypoint', x: 1, y: 0, z: 0, created_at: null },
			],
		});

		const names = getKnownPathNodeNames(state, 1, 2);

		expect(names).toEqual(['Sol', 'Waypoint #4', 'Vega']);
		expect(getKnownPathNodeNames(state, 1, 2)).toBe(names);
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
