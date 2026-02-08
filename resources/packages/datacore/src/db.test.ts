import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { query, run, exec } from './db';
import { openMemoryDb } from './test-helpers';
import { NODES_SCHEMA } from './nodes';
import { STARS_SCHEMA } from './stars';
import { META_SCHEMA } from './meta';
import type { Database } from './db';

let database: Database;

beforeEach(async () => {
	database = await openMemoryDb();
	await exec(database, NODES_SCHEMA);
	await exec(database, STARS_SCHEMA);
	await exec(database, META_SCHEMA);
});

afterEach(async () => {
	await database.sqlite3.close(database.db);
});

describe('query', () => {
	it('returns rows as objects keyed by column name', async () => {
		await run(database, "INSERT INTO nodes (id, type, x, y, z) VALUES (?, ?, ?, ?, ?)", [
			1, 'system', 10.5, 20.3, -5.1,
		]);

		const result = await query(database, 'SELECT id, type, x, y, z FROM nodes WHERE id = ?', [1]);
		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]).toEqual({
			id: 1,
			type: 'system',
			x: 10.5,
			y: 20.3,
			z: -5.1,
		});
		expect(result.columns).toEqual(['id', 'type', 'x', 'y', 'z']);
	});

	it('returns empty array for no matches', async () => {
		const result = await query(database, 'SELECT * FROM nodes WHERE id = ?', [999]);
		expect(result.rows).toHaveLength(0);
	});
});

describe('run', () => {
	it('inserts data', async () => {
		await run(database, "INSERT INTO nodes (id, type, x, y, z) VALUES (?, ?, ?, ?, ?)", [
			1, 'system', 1.0, 2.0, 3.0,
		]);

		const result = await query(database, 'SELECT COUNT(*) as count FROM nodes');
		expect(result.rows[0].count).toBe(1);
	});
});

describe('exec', () => {
	it('executes raw SQL', async () => {
		await exec(database, "INSERT INTO nodes (id, type, x, y, z) VALUES (1, 'system', 0, 0, 0)");
		const result = await query(database, 'SELECT COUNT(*) as count FROM nodes');
		expect(result.rows[0].count).toBe(1);
	});
});

describe('star map query', () => {
	it('joins nodes and stars with is_primary filter', async () => {
		await run(database, "INSERT INTO nodes (id, type, x, y, z) VALUES (?, ?, ?, ?, ?)", [
			10, 'system', 1.0, 2.0, 3.0,
		]);
		await run(
			database,
			`INSERT INTO stars (id, node_id, title, catalog_id, spectral_class, post_type, x, y, z, mass, radius, is_primary)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[100, 10, 'Alpha', 'ALPHA_1', 'G', 'helm_star', 1.1, 2.1, 3.1, 1.0, 1.0, 1],
		);
		await run(
			database,
			`INSERT INTO stars (id, node_id, title, catalog_id, spectral_class, post_type, x, y, z, mass, radius, is_primary)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[101, 10, 'Alpha B', 'ALPHA_2', 'K', 'helm_star', 1.1, 2.1, 3.1, 0.5, 0.7, 0],
		);

		const result = await query(
			database,
			`SELECT s.id, s.title, s.catalog_id, s.spectral_class,
			        n.x, n.y, n.z, s.mass, s.radius, n.type AS node_type
			 FROM stars s
			 JOIN nodes n ON s.node_id = n.id
			 WHERE s.is_primary = 1`,
		);

		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].title).toBe('Alpha');
		expect(result.rows[0].node_type).toBe('system');
		// Coordinates come from the node, not the star.
		expect(result.rows[0].x).toBe(1.0);
		expect(result.rows[0].y).toBe(2.0);
	});
});
