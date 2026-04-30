import type { HelmError } from '@helm/errors';
import type { KnownPathResult } from '@helm/datacore';
import type { StarNode } from '@helm/types';

export type Action =
	| { type: 'SYNC_START' }
	| { type: 'SYNC_FINISHED'; nodes: StarNode[]; syncResult: SyncResult }
	| { type: 'EDGE_SYNC_FINISHED'; edges: number }
	| { type: 'DIRECT_EDGE_READ_FINISHED'; key: string; hasDirectEdge: boolean }
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
	byId: Record< number, StarNode >;
	syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
	syncResult: SyncResult | null;
	error: HelmError | null;
}

export interface State {
	stars: StarsState;
	graph: GraphState;
}

export interface GraphState {
	directEdges: Record< string, boolean >;
	knownPaths: Record< string, KnownPathResult >;
}
