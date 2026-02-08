import { META_SCHEMA, createMetaRepository } from './meta';
import { NODES_SCHEMA, createNodesRepository } from './nodes';
import { STARS_SCHEMA, createStarsRepository } from './stars';
import type {
	Connection,
	Datacore,
	DatacoreOptions,
	SQLiteParam,
	SQLiteValue,
	WorkerRequest,
	WorkerResponse,
} from './types';

type PendingRequest = {
	resolve: (value: WorkerResponse) => void;
	reject: (reason: Error) => void;
};

let counter = 0;
function nextId(): string {
	return `dc_${++counter}`;
}

/**
 * Thrown when the browser lacks the APIs required for Datacore
 * (Web Workers, IndexedDB). The app cannot function without
 * persistent client-side storage.
 */
export class DatacoreUnsupportedError extends Error {
	constructor(missing: string) {
		super(`Datacore requires ${missing}, which is not available in this browser.`);
		this.name = 'DatacoreUnsupportedError';
	}
}

/**
 * Create a Datacore instance backed by a web worker.
 *
 * The worker boots SQLite with OPFS persistence, then accepts
 * query, run, exec, and close messages over postMessage.
 *
 * @throws {DatacoreUnsupportedError} if the browser lacks required APIs.
 */
export async function createDatacore(options: DatacoreOptions = {}): Promise<Datacore> {
	if (typeof Worker === 'undefined') {
		throw new DatacoreUnsupportedError('Web Workers');
	}
	if (!navigator.storage?.getDirectory) {
		throw new DatacoreUnsupportedError('Origin Private File System');
	}

	const pending = new Map<string, PendingRequest>();

	const workerUrl = options.workerUrl ?? new URL('./worker.ts', import.meta.url);
	const worker = new Worker(workerUrl, { type: 'module' });

	worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
		const msg = event.data;

		const req = pending.get(msg.id);
		if (!req) return;
		pending.delete(msg.id);

		if (msg.type === 'error') {
			req.reject(new Error(msg.payload.message));
		} else {
			req.resolve(msg);
		}
	};

	worker.onerror = (event) => {
		const err = new Error(event.message ?? 'Worker error');
		for (const req of pending.values()) {
			req.reject(err);
		}
		pending.clear();
	};

	function send(message: WorkerRequest): Promise<WorkerResponse> {
		return new Promise<WorkerResponse>((resolve, reject) => {
			pending.set(message.id, { resolve, reject });
			worker.postMessage(message);
		});
	}

	async function sendQuery<Row>(
		sql: string,
		params?: SQLiteParam[],
	): Promise<Row[]> {
		const response = await send({
			id: nextId(),
			type: 'query',
			payload: { sql, params },
		});

		if (response.type !== 'result') {
			throw new Error(`Unexpected response type: ${response.type}`);
		}

		return response.payload.rows.map((row) => {
			const obj: Record<string, SQLiteValue> = {};
			for (let i = 0; i < response.payload.columns.length; i++) {
				obj[response.payload.columns[i]] = row[i];
			}
			return obj as Row;
		});
	}

	async function sendRun(sql: string, params?: SQLiteParam[]): Promise<void> {
		const response = await send({
			id: nextId(),
			type: 'run',
			payload: { sql, params },
		});

		if (response.type !== 'result') {
			throw new Error(`Unexpected response type: ${response.type}`);
		}
	}

	async function sendExec(sql: string): Promise<void> {
		const response = await send({
			id: nextId(),
			type: 'exec',
			payload: { sql },
		});

		if (response.type !== 'result') {
			throw new Error(`Unexpected response type: ${response.type}`);
		}
	}

	let savepointId = 0;

	async function sendTransaction<T>(fn: () => Promise<T>): Promise<T> {
		const name = `sp_${++savepointId}`;
		await sendExec(`SAVEPOINT ${name}`);
		try {
			const result = await fn();
			await sendExec(`RELEASE ${name}`);
			return result;
		} catch (e) {
			await sendExec(`ROLLBACK TO ${name}`);
			await sendExec(`RELEASE ${name}`);
			throw e;
		}
	}

	// Boot the worker — wait for 'ready'.
	await send({ id: nextId(), type: 'init' });

	// Create schema (nodes first — stars has FK).
	await sendExec(NODES_SCHEMA);
	await sendExec(STARS_SCHEMA);
	await sendExec(META_SCHEMA);

	const conn: Connection = {
		query: sendQuery,
		run: sendRun,
		exec: sendExec,
		transaction: sendTransaction,
	};

	return {
		...createStarsRepository(conn),
		...createNodesRepository(conn),
		...createMetaRepository(conn),
		transaction: sendTransaction,

		async close(): Promise<void> {
			await send({ id: nextId(), type: 'close' });
			worker.terminate();
		},
	};
}
