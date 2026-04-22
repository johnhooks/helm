import { test, expect } from './fixtures';
import { makeApiNode, makeStar } from './factories';
import type { Route } from '@playwright/test';

const NODES_PATH = '**/helm/v1/nodes*';
const EDGES_PATH = '**/helm/v1/edges*';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function runSync(page: import('@playwright/test').Page) {
	return page.evaluate(async () => {
		return window.helm.syncNodes(window.helm.dc);
	});
}

async function getNodeCount(page: import('@playwright/test').Page): Promise<number> {
	return page.evaluate(async () => {
		const count = await window.helm.dc.getMeta('cache.node_count');
		return count ? Number(count) : 0;
	});
}

async function getStarCount(page: import('@playwright/test').Page): Promise<number> {
	return page.evaluate(async () => {
		const count = await window.helm.dc.getMeta('cache.star_count');
		return count ? Number(count) : 0;
	});
}

async function getWaypointCount(page: import('@playwright/test').Page): Promise<number> {
	return page.evaluate(async () => {
		const count = await window.helm.dc.getMeta('cache.waypoint_count');
		return count ? Number(count) : 0;
	});
}

async function getEdgeCount(page: import('@playwright/test').Page): Promise<number> {
	return page.evaluate(async () => {
		const count = await window.helm.dc.getMeta('cache.edge_count');
		return count ? Number(count) : 0;
	});
}

/**
 * Build a paginated route handler that serves nodes across pages.
 *
 * @param pages Array of arrays — each inner array is one page of node responses.
 */
function paginatedRoute(pages: Record<string, unknown>[][]) {
	return (route: Route) => {
		const url = new URL(route.request().url());
		const page = Number(url.searchParams.get('page') ?? '1');
		const body = pages[page - 1] ?? [];

		route.fulfill({
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'X-WP-TotalPages': String(pages.length),
			},
			body: JSON.stringify(body),
		});
	};
}

function makeEdge(id: number, nodeAId: number, nodeBId: number) {
	return {
		id,
		node_a_id: nodeAId,
		node_b_id: nodeBId,
		distance: 1.5,
		discovered_at: '2026-01-01T00:00:00Z',
	};
}

async function mockEdges(
	page: import('@playwright/test').Page,
	pages: Record<string, unknown>[][] = [[]],
) {
	await page.route(EDGES_PATH, paginatedRoute(pages));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Cache E2E', () => {
	// -------------------------------------------------------------------
	// Pagination
	// -------------------------------------------------------------------

	test.describe('Pagination', () => {
		test('single page — all nodes synced', async ({ page }) => {
			const nodes = Array.from({ length: 10 }, (_, i) => {
				const id = i + 1;
				return makeApiNode(id, [makeStar({ id: id * 10, node_id: id })]);
			});

			await page.route(NODES_PATH, paginatedRoute([nodes]));
			await mockEdges(page, [[makeEdge(1, 1, 2), makeEdge(2, 2, 3)]]);
			const result = await runSync(page);

			expect(result.nodes).toBe(10);
			expect(result.stars).toBe(10);
			expect(result.edges).toBe(2);
			expect(await getNodeCount(page)).toBe(10);
			expect(await getStarCount(page)).toBe(10);
			expect(await getWaypointCount(page)).toBe(0);
			expect(await getEdgeCount(page)).toBe(2);

			const syncedAt = await page.evaluate(async () => {
				return window.helm.dc.getMeta('cache.synced_at');
			});
			expect(syncedAt).toBeTruthy();
		});

		test('two pages — both pages synced', async ({ page }) => {
			const page1 = Array.from({ length: 8 }, (_, i) => {
				const id = i + 1;
				return makeApiNode(id, [makeStar({ id: id * 10, node_id: id })]);
			});
			const page2 = Array.from({ length: 4 }, (_, i) => {
				const id = i + 9;
				return makeApiNode(id, [makeStar({ id: id * 10, node_id: id })]);
			});

			let requestCount = 0;
			await page.route(NODES_PATH, (route) => {
				requestCount++;
				paginatedRoute([page1, page2])(route);
			});
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);

			const result = await runSync(page);

			expect(result.nodes).toBe(12);
			expect(result.stars).toBe(12);
			expect(result.edges).toBe(1);
			expect(requestCount).toBe(2);
		});

		test('three pages — all pages synced', async ({ page }) => {
			const page1 = Array.from({ length: 7 }, (_, i) => {
				const id = i + 1;
				return makeApiNode(id, [makeStar({ id: id * 10, node_id: id })]);
			});
			const page2 = Array.from({ length: 7 }, (_, i) => {
				const id = i + 8;
				return makeApiNode(id, [makeStar({ id: id * 10, node_id: id })]);
			});
			const page3 = Array.from({ length: 6 }, (_, i) => {
				const id = i + 15;
				return makeApiNode(id, [makeStar({ id: id * 10, node_id: id })]);
			});

			let requestCount = 0;
			await page.route(NODES_PATH, (route) => {
				requestCount++;
				paginatedRoute([page1, page2, page3])(route);
			});
			await mockEdges(page, [[makeEdge(1, 1, 2), makeEdge(2, 2, 3), makeEdge(3, 3, 4)]]);

			const result = await runSync(page);

			expect(result.nodes).toBe(20);
			expect(result.stars).toBe(20);
			expect(result.edges).toBe(3);
			expect(requestCount).toBe(3);
		});

		test('nodes with multiple stars', async ({ page }) => {
			const nodes = [
				makeApiNode(1, [
					makeStar({ id: 10, node_id: 1 }),
					makeStar({ id: 11, node_id: 1 }),
					makeStar({ id: 12, node_id: 1 }),
				]),
				makeApiNode(2, [makeStar({ id: 20, node_id: 2 })]),
				makeApiNode(3),
			];

			await page.route(NODES_PATH, paginatedRoute([nodes]));
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);
			const result = await runSync(page);

			expect(result.nodes).toBe(3);
			expect(result.stars).toBe(4);
			expect(result.edges).toBe(1);

			const starsAtNode1 = await page.evaluate(async () => {
				return window.helm.dc.getStarsAtNode(1);
			});
			expect(starsAtNode1).toHaveLength(3);

			const starsAtNode3 = await page.evaluate(async () => {
				return window.helm.dc.getStarsAtNode(3);
			});
			expect(starsAtNode3).toHaveLength(0);
		});

		test('empty response — clears existing data', async ({ page }) => {
			const seed = [makeApiNode(1, [makeStar({ id: 10, node_id: 1 })])];
			await page.route(NODES_PATH, paginatedRoute([seed]));
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);
			await runSync(page);
			expect(await getNodeCount(page)).toBe(1);
			expect(await getEdgeCount(page)).toBe(1);

			await page.unrouteAll();
			await page.route(NODES_PATH, paginatedRoute([[]]));
			await mockEdges(page, [[]]);
			const result = await runSync(page);

			expect(result.nodes).toBe(0);
			expect(result.stars).toBe(0);
			expect(result.edges).toBe(0);
			expect(await getNodeCount(page)).toBe(0);
			expect(await getEdgeCount(page)).toBe(0);
		});
	});

	// -------------------------------------------------------------------
	// Data integrity
	// -------------------------------------------------------------------

	test.describe('Data integrity', () => {
		test('synced nodes are queryable from datacore', async ({ page }) => {
			const nodes = [
				makeApiNode(1, [makeStar({ id: 10, node_id: 1 })]),
				makeApiNode(2, [makeStar({ id: 20, node_id: 2 })]),
			];

			await page.route(NODES_PATH, paginatedRoute([nodes]));
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);
			await runSync(page);

			const node1 = await page.evaluate(async () => {
				return window.helm.dc.getNode(1);
			});
			expect(node1).toEqual({
				id: 1,
				type: 'star_system',
				x: 10,
				y: 20,
				z: 30,
				created_at: '2026-01-01T00:00:00Z',
			});

			const node2 = await page.evaluate(async () => {
				return window.helm.dc.getNode(2);
			});
			expect(node2!.id).toBe(2);
		});

		test('sync replaces previous data', async ({ page }) => {
			await page.route(NODES_PATH, paginatedRoute([[makeApiNode(1)]]));
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);
			await runSync(page);
			expect(await getNodeCount(page)).toBe(1);
			expect(await getEdgeCount(page)).toBe(1);

			await page.unrouteAll();
			await page.route(NODES_PATH, paginatedRoute([[makeApiNode(50), makeApiNode(51)]]));
			await mockEdges(page, [[makeEdge(50, 50, 51), makeEdge(51, 51, 52)]]);
			await runSync(page);

			expect(await getNodeCount(page)).toBe(2);
			expect(await getEdgeCount(page)).toBe(2);

			const oldNode = await page.evaluate(async () => {
				return window.helm.dc.getNode(1);
			});
			expect(oldNode).toBeNull();
		});
	});

	// -------------------------------------------------------------------
	// Sync state
	// -------------------------------------------------------------------

	test.describe('Sync state', () => {
		test('synced_at meta is null before first sync', async ({ page }) => {
			const syncedAt = await page.evaluate(async () => {
				return window.helm.dc.getMeta('cache.synced_at');
			});
			expect(syncedAt).toBeNull();
		});

		test('synced_at meta is set after sync', async ({ page }) => {
			await page.route(NODES_PATH, paginatedRoute([[makeApiNode(1)]]));
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);
			await runSync(page);

			const syncedAt = await page.evaluate(async () => {
				return window.helm.dc.getMeta('cache.synced_at');
			});
			expect(syncedAt).toBeTruthy();
			// Should be a valid ISO date.
			expect(new Date(syncedAt!).toISOString()).toBe(syncedAt);
		});
	});

	// -------------------------------------------------------------------
	// Error responses
	// -------------------------------------------------------------------

	test.describe('Error responses', () => {
		test('server 500 — throws CacheFetchFailed, cache untouched', async ({ page }) => {
			await page.route(NODES_PATH, paginatedRoute([[makeApiNode(1)]]));
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);
			await runSync(page);
			expect(await getNodeCount(page)).toBe(1);
			expect(await getEdgeCount(page)).toBe(1);

			await page.unrouteAll();
			await page.route(NODES_PATH, (route) => {
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({
						code: 'internal_server_error',
						message: 'Something went wrong',
						data: { status: 500 },
					}),
				});
			});
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);

			const error = await page.evaluate(async () => {
				try {
					await window.helm.syncNodes(window.helm.dc);
					return null;
				} catch (e: any) {
					return { message: e.message, isSafe: e.isSafe };
				}
			});

			expect(error).not.toBeNull();
			expect(error!.message).toBe('helm.cache.fetch_failed');
			expect(error!.isSafe).toBe(true);

			expect(await getNodeCount(page)).toBe(1);
			expect(await getEdgeCount(page)).toBe(1);
		});

		test('server 403 — throws CacheFetchFailed', async ({ page }) => {
			await page.route(NODES_PATH, (route) => {
				route.fulfill({
					status: 403,
					contentType: 'application/json',
					body: JSON.stringify({
						code: 'rest_forbidden',
						message: 'Sorry, you are not allowed to do that.',
						data: { status: 403 },
					}),
				});
			});
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);

			const error = await page.evaluate(async () => {
				try {
					await window.helm.syncNodes(window.helm.dc);
					return null;
				} catch (e: any) {
					return { message: e.message, isSafe: e.isSafe };
				}
			});

			expect(error).not.toBeNull();
			expect(error!.message).toBe('helm.cache.fetch_failed');
		});

		test('network error — throws CacheFetchFailed', async ({ page }) => {
			await page.route(NODES_PATH, (route) => {
				route.abort('connectionrefused');
			});
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);

			const error = await page.evaluate(async () => {
				try {
					await window.helm.syncNodes(window.helm.dc);
					return null;
				} catch (e: any) {
					return { message: e.message, isSafe: e.isSafe };
				}
			});

			expect(error).not.toBeNull();
			expect(error!.message).toBe('helm.cache.fetch_failed');
			expect(error!.isSafe).toBe(true);
		});

		test('error mid-pagination — throws CacheFetchFailed, cache untouched', async ({ page }) => {
			await page.route(NODES_PATH, paginatedRoute([[makeApiNode(1)]]));
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);
			await runSync(page);
			expect(await getNodeCount(page)).toBe(1);
			expect(await getEdgeCount(page)).toBe(1);

			await page.unrouteAll();
			let requestNum = 0;
			await page.route(NODES_PATH, (route) => {
				requestNum++;
				if (requestNum === 1) {
					route.fulfill({
						status: 200,
						headers: {
							'Content-Type': 'application/json',
							'X-WP-TotalPages': '2',
						},
						body: JSON.stringify([makeApiNode(10)]),
					});
				} else {
					route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({
							code: 'internal_server_error',
							message: 'Database connection lost',
							data: { status: 500 },
						}),
					});
				}
			});
			await mockEdges(page, [[makeEdge(1, 1, 2)]]);

			const error = await page.evaluate(async () => {
				try {
					await window.helm.syncNodes(window.helm.dc);
					return null;
				} catch (e: any) {
					return { message: e.message };
				}
			});

			expect(error).not.toBeNull();
			expect(error!.message).toBe('helm.cache.fetch_failed');

			expect(await getNodeCount(page)).toBe(1);
			expect(await getEdgeCount(page)).toBe(1);
		});
	});
});
