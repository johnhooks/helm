import type { NavNode } from '@helm/types';
import type { Connection } from './types';

export const NODES_SCHEMA = `
CREATE TABLE IF NOT EXISTS nodes (
  id          INTEGER PRIMARY KEY,
  type        TEXT NOT NULL,
  x           REAL NOT NULL,
  y           REAL NOT NULL,
  z           REAL NOT NULL,
  created_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
`;

/**
 * Single node by ID.
 */
const NODE_BY_ID = `
SELECT id, type, x, y, z, created_at
FROM nodes
WHERE id = ?
`;

export function createNodesRepository(conn: Connection) {
	return {
		async getNode(id: number): Promise<NavNode | null> {
			const rows = await conn.query<NavNode>(NODE_BY_ID, [id]);
			return rows[0] ?? null;
		},

		async insertNode(node: NavNode): Promise<void> {
			await conn.run(
				`INSERT INTO nodes (id, type, x, y, z, created_at)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[node.id, node.type, node.x, node.y, node.z, node.created_at],
			);
		},

		async clearNodes(): Promise<void> {
			await conn.run('DELETE FROM nodes');
		},
	};
}
