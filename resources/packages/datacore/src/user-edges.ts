import type { UserEdge } from '@helm/types';
import type { Connection } from './types';

export const USER_EDGES_SCHEMA = `
CREATE TABLE IF NOT EXISTS user_edges (
  user_id        INTEGER NOT NULL,
  id             INTEGER NOT NULL,
  node_a_id      INTEGER NOT NULL REFERENCES nodes(id),
  node_b_id      INTEGER NOT NULL REFERENCES nodes(id),
  distance       REAL NOT NULL,
  discovered_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_user_edges_user_node_a
  ON user_edges(user_id, node_a_id);
CREATE INDEX IF NOT EXISTS idx_user_edges_user_node_b
  ON user_edges(user_id, node_b_id);
CREATE INDEX IF NOT EXISTS idx_user_edges_user_discovered_at
  ON user_edges(user_id, discovered_at);
`;

const USER_EDGES_AT_NODE = `
SELECT id, node_a_id, node_b_id, distance, discovered_at
FROM user_edges
WHERE user_id = ? AND (node_a_id = ? OR node_b_id = ?)
ORDER BY discovered_at ASC, id ASC
`;

const USER_EDGE_EXISTS_AT_NODE = `
SELECT 1 AS edge_exists
FROM user_edges
WHERE user_id = ? AND (node_a_id = ? OR node_b_id = ?)
LIMIT 1
`;

const CONNECTED_NODE_IDS = `
SELECT DISTINCT
  CASE
    WHEN node_a_id = ? THEN node_b_id
    ELSE node_a_id
  END AS connected_node_id
FROM user_edges
WHERE user_id = ? AND (node_a_id = ? OR node_b_id = ?)
ORDER BY connected_node_id ASC
`;

export function createUserEdgesRepository(conn: Connection, userId: number) {
	return {
		async insertUserEdge(edge: UserEdge): Promise<void> {
			await conn.run(
				`INSERT INTO user_edges (user_id, id, node_a_id, node_b_id, distance, discovered_at)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(user_id, id) DO UPDATE SET
				   node_a_id = excluded.node_a_id,
				   node_b_id = excluded.node_b_id,
				   distance = excluded.distance,
				   discovered_at = excluded.discovered_at`,
				[userId, edge.id, edge.node_a_id, edge.node_b_id, edge.distance, edge.discovered_at],
			);
		},

		async insertUserEdges(edges: UserEdge[]): Promise<void> {
			const chunkSize = 166; // 6 columns × 166 = 996 params (SQLite limit: 999)
			for (let i = 0; i < edges.length; i += chunkSize) {
				const chunk = edges.slice(i, i + chunkSize);
				const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
				const params = chunk.flatMap((edge) => [
					userId,
					edge.id,
					edge.node_a_id,
					edge.node_b_id,
					edge.distance,
					edge.discovered_at,
				]);

				await conn.run(
					`INSERT INTO user_edges (user_id, id, node_a_id, node_b_id, distance, discovered_at)
					 VALUES ${placeholders}
					 ON CONFLICT(user_id, id) DO UPDATE SET
					   node_a_id = excluded.node_a_id,
					   node_b_id = excluded.node_b_id,
					   distance = excluded.distance,
					   discovered_at = excluded.discovered_at`,
					params,
				);
			}
		},

		async clearUserEdges(): Promise<void> {
			await conn.run('DELETE FROM user_edges WHERE user_id = ?', [userId]);
		},

		getUserEdgesAtNode(nodeId: number): Promise<UserEdge[]> {
			return conn.query<UserEdge>(USER_EDGES_AT_NODE, [userId, nodeId, nodeId]);
		},

		async hasUserEdgesAtNode(nodeId: number): Promise<boolean> {
			const rows = await conn.query<{ edge_exists: number }>(USER_EDGE_EXISTS_AT_NODE, [userId, nodeId, nodeId]);
			return rows.length > 0;
		},

		async getConnectedNodeIds(nodeId: number): Promise<number[]> {
			const rows = await conn.query<{ connected_node_id: number }>(CONNECTED_NODE_IDS, [
				nodeId,
				userId,
				nodeId,
				nodeId,
			]);

			return rows.map((row) => row.connected_node_id);
		},
	};
}
