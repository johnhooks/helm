import type { Thunk } from '@helm/types';
import type { Action } from './types';
import type { store } from './index';
import { createGraphReadKey } from './utils';

export const getStarNodes =
	(): Thunk<Action, typeof store> =>
	async ({ dispatch, select }) => {
		// Try loading from persisted datacore (OPFS).
		await dispatch.hydrate();
		if (select.getSyncStatus() === 'synced') {
			await dispatch.syncUserEdgesIfStale();
			return;
		}

		// Nothing cached — full sync from REST.
		await dispatch.syncNodes();
	};

export const hasDirectEdgeBetween =
	(fromNodeId: number, targetNodeId: number): Thunk<Action, typeof store> =>
	async ({ dispatch }) => {
		const dc = await dispatch.initialize();
		const hasDirectEdge = await dc.hasDirectEdgeBetween(
			fromNodeId,
			targetNodeId
		);

		await dispatch.receiveAdjacency(
			fromNodeId,
			targetNodeId,
			hasDirectEdge
		);
	};

export const getUserEdges =
	(): Thunk<Action, typeof store> =>
	async ({ dispatch }) => {
		const dc = await dispatch.initialize();
		const userEdges = await dc.getUserEdges();
		const nodeIds = [
			...new Set(
				userEdges.flatMap((edge) => [edge.node_a_id, edge.node_b_id])
			),
		];
		const edgeNodes = await dc.getNodes(nodeIds);

		dispatch({
			type: 'USER_EDGE_GRAPH_SYNC_FINISHED',
			userEdges,
			edgeNodes,
		});
	};

export const findKnownPath =
	(fromNodeId: number, targetNodeId: number): Thunk<Action, typeof store> =>
	async ({ dispatch }) => {
		const dc = await dispatch.initialize();
		const path = await dc.findKnownPath(fromNodeId, targetNodeId);

		dispatch({
			type: 'KNOWN_PATH_READ_FINISHED',
			key: createGraphReadKey(fromNodeId, targetNodeId),
			path,
		});
	};
