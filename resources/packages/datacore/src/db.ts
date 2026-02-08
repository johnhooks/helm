import type { SQLiteParam, SQLiteValue } from './types';

/**
 * Thin wrapper around a wa-sqlite database handle.
 *
 * Keeps the sqlite3 API instance + db pointer together so callers
 * don't have to thread both through every function.
 */
export interface Database {
	/**
	 * wa-sqlite API object (from `SQLite.Factory(module)`).
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sqlite3: any;
	/**
	 * Database pointer returned by `sqlite3.open_v2()`.
	 */
	db: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Execute a read query and return typed row objects.
 *
 * Each row is an object keyed by column name — keeps the public API
 * ergonomic while the underlying driver returns arrays.
 */
export async function query<T extends Record<string, SQLiteValue>>(
	database: Database,
	sql: string,
	params?: SQLiteParam[],
): Promise<{ rows: T[]; columns: string[] }> {
	const result: { rows: SQLiteValue[][]; columns: string[] } =
		await database.sqlite3.execWithParams(database.db, sql, params);
	const objects = result.rows.map((row) => {
		const obj: Record<string, SQLiteValue> = {};
		for (let i = 0; i < result.columns.length; i++) {
			obj[result.columns[i]] = row[i];
		}
		return obj as T;
	});
	return { rows: objects, columns: result.columns };
}

/**
 * Execute a write statement (INSERT, UPDATE, DELETE, etc.).
 */
export async function run(
	database: Database,
	sql: string,
	params?: SQLiteParam[],
): Promise<void> {
	await database.sqlite3.run(database.db, sql, params);
}

/**
 * Execute raw SQL with no parameters or return value (DDL, PRAGMA, etc.).
 */
export async function exec(database: Database, sql: string): Promise<void> {
	await database.sqlite3.exec(database.db, sql);
}
