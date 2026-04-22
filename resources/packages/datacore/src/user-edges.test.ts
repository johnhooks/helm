import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exec, query, run } from './db';
import { NODES_SCHEMA } from './nodes';
import { openMemoryDb } from './test-helpers';
import type { Database } from './db';
import type { Connection, SQLiteParam, SQLiteValue } from './types';
import { USER_EDGES_SCHEMA, createUserEdgesRepository } from './user-edges';

let database: Database;

function createConnection(): Connection {
	return {
		query: async <Row>(sql: string, params?: SQLiteParam[]) => {
			const result = await query<Row & Record<string, SQLiteValue>>(database, sql, params);
			return result.rows as Row[];
		},
		run: async (sql: string, params?: SQLiteParam[]) => {
			await run(database, sql, params);
		},
		exec: async (sql: string) => {
			await exec(database, sql);
		},
		transaction: async <T>(fn: () => Promise<T>) => fn(),
	};
}

beforeEach(async () => {
	database = await openMemoryDb();
	await exec(database, NODES_SCHEMA);
	await exec(database, USER_EDGES_SCHEMA);
	await database.sqlite3.run(
		database.db,
		'INSERT INTO nodes (id, type, x, y, z, created_at) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)',
		[
			1, 'system', 0, 0, 0, null,
			2, 'system', 1, 0, 0, null,
			3, 'system', 2, 0, 0, null,
			4, 'waypoint', 3, 0, 0, null,
		],
	);
});

afterEach(async () => {
	await database.sqlite3.close(database.db);
});

describe('createUserEdgesRepository', () => {
	it('creates the schema with nodes present', async () => {
		const result = await query<{ name: string }>(
			database,
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_edges'",
		);
		expect(result.rows).toEqual([{ name: 'user_edges' }]);
	});

	it('upsert is idempotent for the same user and edge id', async () => {
		const repo = createUserEdgesRepository(createConnection(), 7);

		await repo.insertUserEdge({
			id: 99,
			node_a_id: 1,
			node_b_id: 2,
			distance: 1.5,
			discovered_at: '2026-04-20T00:00:00+00:00',
		});
		await repo.insertUserEdge({
			id: 99,
			node_a_id: 1,
			node_b_id: 2,
			distance: 2.0,
			discovered_at: '2026-04-21T00:00:00+00:00',
		});

		const result = await query<{ count: number; distance: number; discovered_at: string }>(
			database,
			'SELECT COUNT(*) AS count, MAX(distance) AS distance, MAX(discovered_at) AS discovered_at FROM user_edges WHERE user_id = ? AND id = ?',
			[7, 99],
		);

		expect(result.rows[0]).toEqual({
			count: 1,
			distance: 2,
			discovered_at: '2026-04-21T00:00:00+00:00',
		});
	});

	it('allows two users to cache the same edge id independently', async () => {
		const userA = createUserEdgesRepository(createConnection(), 7);
		const userB = createUserEdgesRepository(createConnection(), 8);

		await userA.insertUserEdge({
			id: 99,
			node_a_id: 1,
			node_b_id: 2,
			distance: 1.5,
			discovered_at: '2026-04-20T00:00:00+00:00',
		});
		await userB.insertUserEdge({
			id: 99,
			node_a_id: 2,
			node_b_id: 3,
			distance: 2.5,
			discovered_at: '2026-04-21T00:00:00+00:00',
		});

		const result = await query<{ user_id: number; node_a_id: number; node_b_id: number }>(
			database,
			'SELECT user_id, node_a_id, node_b_id FROM user_edges WHERE id = ? ORDER BY user_id ASC',
			[99],
		);

		expect(result.rows).toEqual([
			{ user_id: 7, node_a_id: 1, node_b_id: 2 },
			{ user_id: 8, node_a_id: 2, node_b_id: 3 },
		]);
	});

	it('clearUserEdges only removes rows for the current user', async () => {
		const userA = createUserEdgesRepository(createConnection(), 7);
		const userB = createUserEdgesRepository(createConnection(), 8);

		await userA.insertUserEdge({
			id: 99,
			node_a_id: 1,
			node_b_id: 2,
			distance: 1.5,
			discovered_at: '2026-04-20T00:00:00+00:00',
		});
		await userB.insertUserEdge({
			id: 100,
			node_a_id: 2,
			node_b_id: 3,
			distance: 2.5,
			discovered_at: '2026-04-21T00:00:00+00:00',
		});

		await userA.clearUserEdges();

		const result = await query<{ user_id: number; id: number }>(
			database,
			'SELECT user_id, id FROM user_edges ORDER BY user_id ASC, id ASC',
		);

		expect(result.rows).toEqual([{ user_id: 8, id: 100 }]);
	});

	it('node-based queries only return rows for the current user', async () => {
		const userA = createUserEdgesRepository(createConnection(), 7);
		const userB = createUserEdgesRepository(createConnection(), 8);

		await userA.insertUserEdges([
			{
				id: 99,
				node_a_id: 1,
				node_b_id: 2,
				distance: 1.5,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 100,
				node_a_id: 3,
				node_b_id: 1,
				distance: 2.5,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
		]);
		await userB.insertUserEdge({
			id: 101,
			node_a_id: 1,
			node_b_id: 4,
			distance: 3.5,
			discovered_at: '2026-04-22T00:00:00+00:00',
		});

		await expect(userA.getUserEdgesAtNode(1)).resolves.toEqual([
			{
				id: 99,
				node_a_id: 1,
				node_b_id: 2,
				distance: 1.5,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 100,
				node_a_id: 3,
				node_b_id: 1,
				distance: 2.5,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
		]);
		await expect(userA.hasUserEdgesAtNode(4)).resolves.toBe(false);
		await expect(userB.hasUserEdgesAtNode(4)).resolves.toBe(true);
	});

	it('getConnectedNodeIds de-duplicates and orders results', async () => {
		const repo = createUserEdgesRepository(createConnection(), 7);

		await repo.insertUserEdges([
			{
				id: 99,
				node_a_id: 1,
				node_b_id: 2,
				distance: 1.5,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 100,
				node_a_id: 3,
				node_b_id: 1,
				distance: 2.5,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
			{
				id: 101,
				node_a_id: 1,
				node_b_id: 2,
				distance: 1.5,
				discovered_at: '2026-04-22T00:00:00+00:00',
			},
		]);

		await expect(repo.getConnectedNodeIds(1)).resolves.toEqual([2, 3]);
	});
});
