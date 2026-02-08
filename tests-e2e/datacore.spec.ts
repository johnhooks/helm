import { test, expect } from './fixtures';
import { makeNode, makeStar } from './factories';

// ---------------------------------------------------------------------------
// Datacore E2E
// ---------------------------------------------------------------------------

test.describe('Datacore E2E', () => {
	// -----------------------------------------------------------------------
	// Nodes CRUD
	// -----------------------------------------------------------------------

	test.describe('Nodes', () => {
		test('insertNode → getNode round-trip', async ({ page }) => {
			const node = makeNode();

			const result = await page.evaluate(async (n) => {
				const { dc } = window.helm;
				await dc.insertNode(n);
				return dc.getNode(n.id);
			}, node);

			expect(result).toEqual(node);
		});

		test('clearNodes removes all nodes', async ({ page }) => {
			const node = makeNode();

			const result = await page.evaluate(async (n) => {
				const { dc } = window.helm;
				await dc.insertNode(n);
				await dc.clearNodes();
				return dc.getNode(n.id);
			}, node);

			expect(result).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// Stars CRUD
	// -----------------------------------------------------------------------

	test.describe('Stars', () => {
		test('insertStar → getStarsAtNode returns star with boolean is_primary', async ({ page }) => {
			const node = makeNode();
			const star = makeStar({ node_id: node.id });

			const result = await page.evaluate(async ({ n, s }) => {
				const { dc } = window.helm;
				await dc.insertNode(n);
				await dc.insertStar(s);
				return dc.getStarsAtNode(n.id);
			}, { n: node, s: star });

			expect(result).toHaveLength(1);
			expect(result[0].is_primary).toBe(true);
			expect(result[0].title).toBe('Star-1');
		});

		test('getStarMap returns only primary stars', async ({ page }) => {
			const node = makeNode();
			const primary = makeStar({ id: 1, node_id: node.id, is_primary: true, title: 'Alpha' });
			const companion = makeStar({ id: 2, node_id: node.id, is_primary: false, title: 'Beta' });

			const result = await page.evaluate(async ({ n, p, c }) => {
				const { dc } = window.helm;
				await dc.insertNode(n);
				await dc.insertStar(p);
				await dc.insertStar(c);
				return dc.getStarMap();
			}, { n: node, p: primary, c: companion });

			expect(result).toHaveLength(1);
			expect(result[0].title).toBe('Alpha');
		});

		test('clearStars removes all stars', async ({ page }) => {
			const node = makeNode();
			const star = makeStar({ node_id: node.id });

			const result = await page.evaluate(async ({ n, s }) => {
				const { dc } = window.helm;
				await dc.insertNode(n);
				await dc.insertStar(s);
				await dc.clearStars();
				return dc.getStarsAtNode(n.id);
			}, { n: node, s: star });

			expect(result).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// Meta CRUD
	// -----------------------------------------------------------------------

	test.describe('Meta', () => {
		test('setMeta → getMeta round-trip', async ({ page }) => {
			const result = await page.evaluate(async () => {
				const { dc } = window.helm;
				await dc.setMeta('version', '42');
				return dc.getMeta('version');
			});

			expect(result).toBe('42');
		});

		test('getMeta returns null for missing key', async ({ page }) => {
			const result = await page.evaluate(async () => {
				return window.helm.dc.getMeta('nonexistent');
			});

			expect(result).toBeNull();
		});
	});

	// -----------------------------------------------------------------------
	// Transactions
	// -----------------------------------------------------------------------

	test.describe('Transactions', () => {
		test('commit: data persists after successful transaction', async ({ page }) => {
			const node = makeNode();

			const result = await page.evaluate(async (n) => {
				const { dc } = window.helm;
				await dc.transaction(async () => {
					await dc.insertNode(n);
				});
				return dc.getNode(n.id);
			}, node);

			expect(result).toEqual(node);
		});

		test('rollback: data discarded when transaction throws', async ({ page }) => {
			const node = makeNode();

			const result = await page.evaluate(async (n) => {
				const { dc } = window.helm;
				try {
					await dc.transaction(async () => {
						await dc.insertNode(n);
						throw new Error('boom');
					});
				} catch {
					// Expected.
				}
				return dc.getNode(n.id);
			}, node);

			expect(result).toBeNull();
		});

		test('return value: transaction returns callback result', async ({ page }) => {
			const result = await page.evaluate(async () => {
				return window.helm.dc.transaction(async () => 42);
			});

			expect(result).toBe(42);
		});

		test('nested: both succeed, data from both persists', async ({ page }) => {
			const outer = makeNode({ id: 1 });
			const inner = makeNode({ id: 2, x: 99 });

			const result = await page.evaluate(async ({ o, i }) => {
				const { dc } = window.helm;
				await dc.transaction(async () => {
					await dc.insertNode(o);
					await dc.transaction(async () => {
						await dc.insertNode(i);
					});
				});
				return {
					outer: await dc.getNode(o.id),
					inner: await dc.getNode(i.id),
				};
			}, { o: outer, i: inner });

			expect(result.outer).toEqual(outer);
			expect(result.inner).toEqual(inner);
		});

		test('nested: inner throws, outer catches — inner rolled back, outer persists', async ({ page }) => {
			const outer = makeNode({ id: 1 });
			const inner = makeNode({ id: 2, x: 99 });

			const result = await page.evaluate(async ({ o, i }) => {
				const { dc } = window.helm;
				await dc.transaction(async () => {
					await dc.insertNode(o);
					try {
						await dc.transaction(async () => {
							await dc.insertNode(i);
							throw new Error('inner boom');
						});
					} catch {
						// Outer catches inner failure and continues.
					}
				});
				return {
					outer: await dc.getNode(o.id),
					inner: await dc.getNode(i.id),
				};
			}, { o: outer, i: inner });

			expect(result.outer).toEqual(outer);
			expect(result.inner).toBeNull();
		});

		test('nested: inner succeeds then outer throws — everything rolled back', async ({ page }) => {
			const outer = makeNode({ id: 1 });
			const inner = makeNode({ id: 2, x: 99 });

			const result = await page.evaluate(async ({ o, i }) => {
				const { dc } = window.helm;
				try {
					await dc.transaction(async () => {
						await dc.insertNode(o);
						await dc.transaction(async () => {
							await dc.insertNode(i);
						});
						throw new Error('outer boom');
					});
				} catch {
					// Expected.
				}
				return {
					outer: await dc.getNode(o.id),
					inner: await dc.getNode(i.id),
				};
			}, { o: outer, i: inner });

			expect(result.outer).toBeNull();
			expect(result.inner).toBeNull();
		});
	});
});
