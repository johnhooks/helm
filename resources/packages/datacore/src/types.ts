import type { NavNode, Star, StarNode, UserEdge } from '@helm/types';

/**
 * SQLite-compatible parameter types for binding.
 */
export type SQLiteParam = number | string | Uint8Array | bigint | null;

/**
 * Thin wrapper around sendQuery/sendRun for domain modules.
 */
export interface Connection {
	query: <Row>(sql: string, params?: SQLiteParam[]) => Promise<Row[]>;
	run: (sql: string, params?: SQLiteParam[]) => Promise<void>;
	exec: (sql: string) => Promise<void>;
	transaction: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * SQLite-compatible value types returned from queries.
 */
export type SQLiteValue = number | string | Uint8Array | bigint | null;

// ---------------------------------------------------------------------------
// Worker message protocol
// ---------------------------------------------------------------------------

export interface InitMessage {
	id: string;
	type: 'init';
}

export interface ExecMessage {
	id: string;
	type: 'exec';
	payload: {
		sql: string;
	};
}

export interface QueryMessage {
	id: string;
	type: 'query';
	payload: {
		sql: string;
		params?: SQLiteParam[];
	};
}

export interface RunMessage {
	id: string;
	type: 'run';
	payload: {
		sql: string;
		params?: SQLiteParam[];
	};
}

export interface CloseMessage {
	id: string;
	type: 'close';
}

export type WorkerRequest = InitMessage | ExecMessage | QueryMessage | RunMessage | CloseMessage;

export interface ReadyResponse {
	id: string;
	type: 'ready';
}

export interface ResultResponse {
	id: string;
	type: 'result';
	payload: {
		rows: SQLiteValue[][];
		columns: string[];
	};
}

export interface ErrorResponse {
	id: string;
	type: 'error';
	payload: {
		message: string;
	};
}

export type WorkerResponse =
	| ReadyResponse
	| ResultResponse
	| ErrorResponse;

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------


/**
 * What SQLite actually returns for star rows — `is_primary` is INTEGER (0|1),
 * not boolean. Used as the trust-boundary type inside `sendQuery<StarRow>()`.
 */
export type StarRow = Omit<Star, 'is_primary'> & { is_primary: number };

export interface DatacoreOptions {
	workerUrl?: string | URL;
	userId: number;
}

export interface KnownPathResult {
	reachable: boolean;
	direct: boolean;
	nodeIds: number[];
	edgeIds: number[];
	totalDistance: number;
	nextNodeId: number | null;
}

export interface Datacore {
	// Nodes
	insertNode: (node: NavNode) => Promise<void>;
	insertNodes: (nodes: NavNode[]) => Promise<void>;
	clearNodes: () => Promise<void>;
	getNode: (id: number) => Promise<NavNode | null>;

	// Stars
	insertStar: (star: Star) => Promise<void>;
	insertStars: (stars: Star[]) => Promise<void>;
	clearStars: () => Promise<void>;
	getStarMap: () => Promise<StarNode[]>;
	getStarsAtNode: (nodeId: number) => Promise<Star[]>;

	// User edges
	insertUserEdge: (edge: UserEdge) => Promise<void>;
	insertUserEdges: (edges: UserEdge[]) => Promise<void>;
	clearUserEdges: () => Promise<void>;
	getUserEdgesAtNode: (nodeId: number) => Promise<UserEdge[]>;
	hasUserEdgesAtNode: (nodeId: number) => Promise<boolean>;
	getConnectedNodeIds: (nodeId: number) => Promise<number[]>;
	hasDirectEdgeBetween: (fromNodeId: number, targetNodeId: number) => Promise<boolean>;
	findKnownPath: (fromNodeId: number, targetNodeId: number) => Promise<KnownPathResult>;

	// Meta
	getMeta: (key: string) => Promise<string | null>;
	setMeta: (key: string, value: string) => Promise<void>;

	// Lifecycle
	transaction: <T>(fn: () => Promise<T>) => Promise<T>;
	close: () => Promise<void>;
}
