import type { Star } from '@helm/types';
import type { Connection, StarMapEntry, StarRow } from './types';

export const STARS_SCHEMA = `
CREATE TABLE IF NOT EXISTS stars (
  id              INTEGER PRIMARY KEY,
  node_id         INTEGER NOT NULL REFERENCES nodes(id),
  title           TEXT NOT NULL,
  catalog_id      TEXT NOT NULL,
  spectral_class  TEXT,
  post_type       TEXT NOT NULL,
  x               REAL NOT NULL,
  y               REAL NOT NULL,
  z               REAL NOT NULL,
  mass            REAL,
  radius          REAL,
  is_primary      INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_stars_node_id ON stars(node_id);
CREATE INDEX IF NOT EXISTS idx_stars_is_primary ON stars(is_primary);
`;

/**
 * Primary stars with their node coordinates for the star map.
 *
 * Returns one row per primary star — the main visual dot on the map.
 */
const STAR_MAP_QUERY = `
SELECT s.id, s.title, s.catalog_id, s.spectral_class,
       n.x, n.y, n.z, s.mass, s.radius, n.type AS node_type
FROM stars s
JOIN nodes n ON s.node_id = n.id
WHERE s.is_primary = 1
`;

/**
 * All stars at a given node (including companions in multi-star systems).
 */
const STARS_AT_NODE = `
SELECT s.id, s.title, s.node_id, s.catalog_id, s.spectral_class,
       s.post_type, s.x, s.y, s.z, s.mass, s.radius, s.is_primary
FROM stars s
WHERE s.node_id = ?
`;

function toStar(row: StarRow): Star {
	return { ...row, is_primary: row.is_primary === 1 };
}

export function createStarsRepository(conn: Connection) {
	return {
		getStarMap(): Promise<StarMapEntry[]> {
			return conn.query<StarMapEntry>(STAR_MAP_QUERY);
		},

		async getStarsAtNode(nodeId: number): Promise<Star[]> {
			const rows = await conn.query<StarRow>(STARS_AT_NODE, [nodeId]);
			return rows.map(toStar);
		},

		async insertStar(star: Star): Promise<void> {
			await conn.run(
				`INSERT INTO stars (id, node_id, title, catalog_id, spectral_class, post_type, x, y, z, mass, radius, is_primary)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					star.id,
					star.node_id,
					star.title,
					star.catalog_id,
					star.spectral_class,
					star.post_type,
					star.x,
					star.y,
					star.z,
					star.mass,
					star.radius,
					star.is_primary ? 1 : 0,
				],
			);
		},

		async insertStars(stars: Star[]): Promise<void> {
			if (stars.length === 0) {
				return;
			}

			const placeholders = stars.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
			const params = stars.flatMap((s) => [
				s.id, s.node_id, s.title, s.catalog_id, s.spectral_class, s.post_type,
				s.x, s.y, s.z, s.mass, s.radius, s.is_primary ? 1 : 0,
			]);
			await conn.run(
				`INSERT INTO stars (id, node_id, title, catalog_id, spectral_class, post_type, x, y, z, mass, radius, is_primary) VALUES ${placeholders}`,
				params,
			);
		},

		async clearStars(): Promise<void> {
			await conn.run('DELETE FROM stars');
		},
	};
}
