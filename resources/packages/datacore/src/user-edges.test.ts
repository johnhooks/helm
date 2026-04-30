import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exec, query, run } from './db';
import { NODES_SCHEMA } from './nodes';
import { openMemoryDb } from './test-helpers';
import type { Database } from './db';
import type { Connection, SQLiteParam, SQLiteValue } from './types';
import { USER_EDGES_SCHEMA, createUserEdgesRepository } from './user-edges';

let database: Database;

function createConnection(onQuery?: (sql: string, params?: SQLiteParam[]) => void): Connection {
	return {
		query: async <Row>(sql: string, params?: SQLiteParam[]) => {
			onQuery?.(sql, params);
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

async function insertNode(id: number, type: 'system' | 'waypoint' = 'waypoint'): Promise<void> {
	await database.sqlite3.run(
		database.db,
		'INSERT INTO nodes (id, type, x, y, z, created_at) VALUES (?, ?, ?, ?, ?, ?)',
		[id, type, id, 0, 0, null],
	);
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

	it('hasDirectEdgeBetween matches either edge direction for the current user', async () => {
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
			node_a_id: 3,
			node_b_id: 4,
			distance: 1.5,
			discovered_at: '2026-04-20T00:00:00+00:00',
		});

		await expect(userA.hasDirectEdgeBetween(1, 2)).resolves.toBe(true);
		await expect(userA.hasDirectEdgeBetween(2, 1)).resolves.toBe(true);
		await expect(userA.hasDirectEdgeBetween(3, 4)).resolves.toBe(false);
	});

	it('findKnownPath returns origin-only result when origin equals target', async () => {
		const repo = createUserEdgesRepository(createConnection(), 7);

		await expect(repo.findKnownPath(1, 1)).resolves.toEqual({
			reachable: true,
			direct: false,
			nodeIds: [1],
			edgeIds: [],
			totalDistance: 0,
			nextNodeId: null,
		});
	});

	it('findKnownPath returns a direct path for adjacent nodes', async () => {
		const repo = createUserEdgesRepository(createConnection(), 7);

		await repo.insertUserEdge({
			id: 99,
			node_a_id: 1,
			node_b_id: 2,
			distance: 1.5,
			discovered_at: '2026-04-20T00:00:00+00:00',
		});

		await expect(repo.findKnownPath(1, 2)).resolves.toEqual({
			reachable: true,
			direct: true,
			nodeIds: [1, 2],
			edgeIds: [99],
			totalDistance: 1.5,
			nextNodeId: 2,
		});
	});

	it('findKnownPath returns an indirect path through waypoint and system nodes', async () => {
		const repo = createUserEdgesRepository(createConnection(), 7);

		await repo.insertUserEdges([
			{
				id: 99,
				node_a_id: 1,
				node_b_id: 4,
				distance: 1.5,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 100,
				node_a_id: 4,
				node_b_id: 2,
				distance: 2.5,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
			{
				id: 101,
				node_a_id: 2,
				node_b_id: 3,
				distance: 3.5,
				discovered_at: '2026-04-22T00:00:00+00:00',
			},
		]);

		await expect(repo.findKnownPath(1, 3)).resolves.toEqual({
			reachable: true,
			direct: false,
			nodeIds: [1, 4, 2, 3],
			edgeIds: [99, 100, 101],
			totalDistance: 7.5,
			nextNodeId: 4,
		});
	});

	it('findKnownPath returns no-path result when the target is unreachable', async () => {
		const repo = createUserEdgesRepository(createConnection(), 7);

		await repo.insertUserEdge({
			id: 99,
			node_a_id: 1,
			node_b_id: 2,
			distance: 1.5,
			discovered_at: '2026-04-20T00:00:00+00:00',
		});

		await expect(repo.findKnownPath(1, 4)).resolves.toEqual({
			reachable: false,
			direct: false,
			nodeIds: [],
			edgeIds: [],
			totalDistance: 0,
			nextNodeId: null,
		});
	});

	it('findKnownPath handles cycles without revisiting forever', async () => {
		const repo = createUserEdgesRepository(createConnection(), 7);

		await repo.insertUserEdges([
			{
				id: 99,
				node_a_id: 1,
				node_b_id: 2,
				distance: 1,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 100,
				node_a_id: 2,
				node_b_id: 3,
				distance: 1,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
			{
				id: 101,
				node_a_id: 3,
				node_b_id: 1,
				distance: 1,
				discovered_at: '2026-04-22T00:00:00+00:00',
			},
			{
				id: 102,
				node_a_id: 3,
				node_b_id: 4,
				distance: 1,
				discovered_at: '2026-04-23T00:00:00+00:00',
			},
		]);

		await expect(repo.findKnownPath(1, 4)).resolves.toEqual({
			reachable: true,
			direct: false,
			nodeIds: [1, 3, 4],
			edgeIds: [101, 102],
			totalDistance: 2,
			nextNodeId: 3,
		});
	});

	it('findKnownPath chooses the shortest path by distance instead of hop count', async () => {
		const repo = createUserEdgesRepository(createConnection(), 7);
		await insertNode(5);

		await repo.insertUserEdges([
			{
				id: 99,
				node_a_id: 1,
				node_b_id: 3,
				distance: 10,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 100,
				node_a_id: 1,
				node_b_id: 2,
				distance: 2,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
			{
				id: 101,
				node_a_id: 2,
				node_b_id: 5,
				distance: 2,
				discovered_at: '2026-04-22T00:00:00+00:00',
			},
			{
				id: 102,
				node_a_id: 5,
				node_b_id: 3,
				distance: 2,
				discovered_at: '2026-04-23T00:00:00+00:00',
			},
		]);

		await expect(repo.findKnownPath(1, 3)).resolves.toEqual({
			reachable: true,
			direct: false,
			nodeIds: [1, 2, 5, 3],
			edgeIds: [100, 101, 102],
			totalDistance: 6,
			nextNodeId: 2,
		});
	});

	it('findKnownPath only uses edges for the current user', async () => {
		const userA = createUserEdgesRepository(createConnection(), 7);
		const userB = createUserEdgesRepository(createConnection(), 8);

		await userA.insertUserEdge({
			id: 99,
			node_a_id: 1,
			node_b_id: 2,
			distance: 1,
			discovered_at: '2026-04-20T00:00:00+00:00',
		});
		await userB.insertUserEdge({
			id: 100,
			node_a_id: 2,
			node_b_id: 3,
			distance: 1,
			discovered_at: '2026-04-21T00:00:00+00:00',
		});

		await expect(userA.findKnownPath(1, 3)).resolves.toEqual({
			reachable: false,
			direct: false,
			nodeIds: [],
			edgeIds: [],
			totalDistance: 0,
			nextNodeId: null,
		});
	});

	it('findKnownPath expands adjacent edges lazily and does not load unrelated chart components', async () => {
		const adjacencyQueries: number[] = [];
		const repo = createUserEdgesRepository(
			createConnection((sql, params) => {
				if (sql.includes('FROM user_edges') && sql.includes('node_a_id = ? OR node_b_id = ?')) {
					adjacencyQueries.push(params?.[1] as number);
				}
			}),
			7,
		);

		await repo.insertUserEdges([
			{
				id: 99,
				node_a_id: 1,
				node_b_id: 2,
				distance: 1,
				discovered_at: '2026-04-20T00:00:00+00:00',
			},
			{
				id: 100,
				node_a_id: 3,
				node_b_id: 4,
				distance: 1,
				discovered_at: '2026-04-21T00:00:00+00:00',
			},
		]);

		await expect(repo.findKnownPath(1, 2)).resolves.toMatchObject({
			reachable: true,
			nodeIds: [1, 2],
			edgeIds: [99],
		});
		expect(adjacencyQueries).toEqual([1]);
	});
});
