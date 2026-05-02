import type { HelmError } from '@helm/errors';
import type { KnownPathResult } from '@helm/datacore';
import type { NavNode, StarNode, UserEdge } from '@helm/types';

export type Action =
	| { type: 'SYNC_START' }
	| { type: 'SYNC_FINISHED'; nodes: StarNode[]; syncResult: SyncResult }
	| { type: 'EDGE_SYNC_FINISHED'; edges: number }
	| {
			type: 'USER_EDGE_GRAPH_SYNC_FINISHED';
			userEdges: UserEdge[];
			edgeNodes: NavNode[];
	  }
	| { type: 'RECEIVE_ADJACENCY'; key: string; adjacent: boolean }
	| { type: 'KNOWN_PATH_READ_FINISHED'; key: string; path: KnownPathResult }
	| { type: 'SYNC_FAILED'; error: HelmError };

export interface SyncResult {
	nodes: number;
	stars: number;
	waypoints: number;
	edges: number;
	syncedAt: string;
}

export interface StarsState {
	byId: Record<number, StarNode>;
	syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
	syncResult: SyncResult | null;
	error: HelmError | null;
}

export interface State {
	stars: StarsState;
	graph: GraphState;
}

export interface GraphState {
	userEdges: UserEdge[] | null;
	edgeNodes: Record<number, NavNode>;
	adjacency: Record<string, boolean>;
	paths: Record<string, KnownPathResult>;
}
