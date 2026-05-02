import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';
import { AccessHandlePoolVFS } from 'wa-sqlite/src/examples/AccessHandlePoolVFS.js';
import { exec, run } from './db';
import type { Database } from './db';
import type {
	ExecMessage,
	QueryMessage,
	RunMessage,
	WorkerRequest,
	WorkerResponse,
	SQLiteValue,
} from './types';

const VFS_DIR = 'helm-datacore';

let database: Database | null = null;

function post(message: WorkerResponse): void {
	self.postMessage(message);
}

function requireDb(): Database {
	if (!database) {
		throw new Error('Database not initialized');
	}
	return database;
}

async function init(id: string): Promise<void> {
	const module = await SQLiteESMFactory();
	const sqlite3 = SQLite.Factory(module);

	const vfs = new AccessHandlePoolVFS(VFS_DIR);
	await vfs.isReady;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sqlite3.vfs_register(vfs as any, true);

	const db = await sqlite3.open_v2(
		'datacore.db',
		SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_READWRITE
	);

	database = { sqlite3, db };

	post({ id, type: 'ready' });
}

async function handleExec(id: string, message: ExecMessage): Promise<void> {
	const db = requireDb();
	await exec(db, message.payload.sql);
	post({ id, type: 'result', payload: { rows: [], columns: [] } });
}

async function handleQuery(id: string, message: QueryMessage): Promise<void> {
	const db = requireDb();
	const { sql, params } = message.payload;

	// Use execWithParams directly to get raw array rows for the wire protocol.
	const result: { rows: SQLiteValue[][]; columns: string[] } =
		await db.sqlite3.execWithParams(db.db, sql, params);

	post({ id, type: 'result', payload: result });
}

async function handleRun(id: string, message: RunMessage): Promise<void> {
	const db = requireDb();
	const { sql, params } = message.payload;
	await run(db, sql, params);
	post({ id, type: 'result', payload: { rows: [], columns: [] } });
}

async function handleClose(id: string): Promise<void> {
	if (database) {
		await database.sqlite3.close(database.db);
		database = null;
	}
	post({ id, type: 'result', payload: { rows: [], columns: [] } });
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const message = event.data;
	try {
		switch (message.type) {
			case 'init':
				await init(message.id);
				break;
			case 'exec':
				await handleExec(message.id, message);
				break;
			case 'query':
				await handleQuery(message.id, message);
				break;
			case 'run':
				await handleRun(message.id, message);
				break;
			case 'close':
				await handleClose(message.id);
				break;
		}
	} catch (error) {
		post({
			id: message.id,
			type: 'error',
			payload: {
				message: error instanceof Error ? error.message : String(error),
			},
		});
	}
};
