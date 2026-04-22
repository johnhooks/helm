import { __ } from '@wordpress/i18n';
import { META_SCHEMA, createMetaRepository } from './meta';
import { NODES_SCHEMA, createNodesRepository } from './nodes';
import { STARS_SCHEMA, createStarsRepository } from './stars';
import { USER_EDGES_SCHEMA, createUserEdgesRepository } from './user-edges';
import { ErrorCode, HelmError } from '@helm/errors';
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
 * Create a Datacore instance backed by a web worker.
 *
 * The worker boots SQLite with OPFS persistence, then accepts
 * query, run, exec, and close messages over postMessage.
 *
 * @param  options
 * @throws {HelmError} with code `helm.datacore.unsupported` if the browser lacks required APIs.
 */
export async function createDatacore(options: DatacoreOptions): Promise<Datacore> {
	if (typeof Worker === 'undefined') {
		throw HelmError.safe(
			ErrorCode.DatacoreUnsupported,
			__('Datacore requires Web Workers, which is not available in this browser.', 'helm'),
		);
	}
	if (!navigator.storage?.getDirectory) {
		throw HelmError.safe(
			ErrorCode.DatacoreUnsupported,
			__('Datacore requires Origin Private File System, which is not available in this browser.', 'helm'),
		);
	}

	const pending = new Map<string, PendingRequest>();

	const workerUrl = options.workerUrl ?? new URL('./worker.ts', import.meta.url);
	const isModule = String(workerUrl).endsWith('.ts') || String(workerUrl).endsWith('.mjs');
	const worker = new Worker(workerUrl, isModule ? { type: 'module' } : undefined);

	worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
		const msg = event.data;

		const req = pending.get(msg.id);
		if (!req) {
			return;
		}
		pending.delete(msg.id);

		if (msg.type === 'error') {
			req.reject(new HelmError(ErrorCode.DatacoreWorkerError, msg.payload.message));
		} else {
			req.resolve(msg);
		}
	};

	worker.onerror = () => {
		const err = new HelmError(ErrorCode.DatacoreWorkerError);
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
			throw new HelmError(ErrorCode.DatacoreUnexpectedResponse);
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
			throw new HelmError(ErrorCode.DatacoreUnexpectedResponse);
		}
	}

	async function sendExec(sql: string): Promise<void> {
		const response = await send({
			id: nextId(),
			type: 'exec',
			payload: { sql },
		});

		if (response.type !== 'result') {
			throw new HelmError(ErrorCode.DatacoreUnexpectedResponse);
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
	await sendExec(USER_EDGES_SCHEMA);
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
		...createUserEdgesRepository(conn, options.userId),
		...createMetaRepository(conn),
		transaction: sendTransaction,

		async close(): Promise<void> {
			await send({ id: nextId(), type: 'close' });
			worker.terminate();
		},
	};
}
