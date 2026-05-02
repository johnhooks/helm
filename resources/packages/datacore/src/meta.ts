import type { Connection } from './types';

export const META_SCHEMA = `
CREATE TABLE IF NOT EXISTS _meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

export function createMetaRepository(conn: Connection) {
	return {
		async getMeta(key: string): Promise<string | null> {
			const rows = await conn.query<{ value: string | null }>(
				'SELECT value FROM _meta WHERE key = ?',
				[key]
			);
			return rows[0]?.value ?? null;
		},

		async setMeta(key: string, value: string): Promise<void> {
			await conn.run(
				'INSERT OR REPLACE INTO _meta (key, value) VALUES (?, ?)',
				[key, value]
			);
		},
	};
}
