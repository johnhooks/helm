import * as SQLite from 'wa-sqlite';
import { MemoryVFS } from 'wa-sqlite/src/examples/MemoryVFS.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Database } from './db';

/**
 * Find the wa-sqlite.wasm file relative to the node_modules location.
 */
function findWasmPath(): string {
	// Walk from the wa-sqlite module entry point to the dist directory.
	const wasmPath = resolve(
		dirname(require.resolve('wa-sqlite/package.json')),
		'dist',
		'wa-sqlite.wasm',
	);
	return wasmPath;
}

/**
 * Open an in-memory wa-sqlite database suitable for Node.js tests.
 *
 * wa-sqlite's default WASM loader uses `fetch()` which doesn't work
 * with file:// URLs in Node. We pre-read the WASM binary and pass it
 * via `wasmBinary` to bypass the fetch entirely.
 */
export async function openMemoryDb(): Promise<Database> {
	const wasmBinary = readFileSync(findWasmPath());

	// Dynamic import since the .mjs module uses import.meta.url
	const { default: SQLiteESMFactory } = await import('wa-sqlite/dist/wa-sqlite.mjs');

	const module = await SQLiteESMFactory({
		wasmBinary,
	});
	const sqlite3 = SQLite.Factory(module);
	const vfs = new MemoryVFS();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sqlite3.vfs_register(vfs as any, true);
	const db = await sqlite3.open_v2(
		'test.db',
		SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_READWRITE,
	);
	return { sqlite3, db };
}
