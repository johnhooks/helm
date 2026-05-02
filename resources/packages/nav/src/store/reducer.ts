import type { StarNode } from '@helm/types';
import type { Action, State } from './types';

function toById(nodes: StarNode[]): Record<number, StarNode> {
	const byId: Record<number, StarNode> = {};
	for (const node of nodes) {
		byId[node.node_id] = node;
	}
	return byId;
}

function toNodeById<Node extends { id: number }>(
	nodes: Node[]
): Record<number, Node> {
	const byId: Record<number, Node> = {};
	for (const node of nodes) {
		byId[node.id] = node;
	}
	return byId;
}

export function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'SYNC_START':
			return {
				...state,
				stars: {
					...state.stars,
					syncStatus: 'syncing',
					error: null,
				},
			};
		case 'SYNC_FINISHED':
			return {
				...state,
				stars: {
					byId: toById(action.nodes),
					syncStatus: 'synced',
					syncResult: action.syncResult,
					error: null,
				},
				graph: {
					...state.graph,
					userEdges: null,
					edgeNodes: {},
				},
			};
		case 'EDGE_SYNC_FINISHED':
			return {
				...state,
				stars: {
					...state.stars,
					syncResult: state.stars.syncResult
						? {
								...state.stars.syncResult,
								edges: action.edges,
						  }
						: null,
					error: null,
				},
				graph: {
					...state.graph,
					userEdges: null,
					edgeNodes: {},
				},
			};
		case 'USER_EDGE_GRAPH_SYNC_FINISHED':
			return {
				...state,
				graph: {
					...state.graph,
					userEdges: action.userEdges,
					edgeNodes: toNodeById(action.edgeNodes),
				},
			};
		case 'RECEIVE_ADJACENCY':
			return {
				...state,
				graph: {
					...state.graph,
					adjacency: {
						...state.graph.adjacency,
						[action.key]: action.adjacent,
					},
				},
			};
		case 'KNOWN_PATH_READ_FINISHED':
			return {
				...state,
				graph: {
					...state.graph,
					paths: {
						...state.graph.paths,
						[action.key]: action.path,
					},
				},
			};
		case 'SYNC_FAILED':
			return {
				...state,
				stars: {
					...state.stars,
					syncStatus: 'error',
					error: action.error,
				},
			};
		default:
			return state;
	}
}

export function initializeDefaultState(): State {
	return {
		stars: {
			byId: {},
			syncStatus: 'idle',
			syncResult: null,
			error: null,
		},
		graph: {
			userEdges: null,
			edgeNodes: {},
			adjacency: {},
			paths: {},
		},
	};
}
