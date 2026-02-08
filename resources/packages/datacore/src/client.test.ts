import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorCode, HelmError } from '@helm/errors';
import { createDatacore } from './client';
import type { WorkerResponse } from './types';

/**
 * Minimal mock Worker that queues messages until a handler is set.
 */
class MockWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;

	private handler: ((msg: unknown) => void) | null = null;
	private queued: unknown[] = [];

	constructor(_url: string | URL, _options?: WorkerOptions) {
		MockWorker.instance = this;
	}

	postMessage(data: unknown): void {
		if (this.handler) {
			this.handler(data);
		} else {
			this.queued.push(data);
		}
	}

	terminate(): void {
		// no-op
	}

	/** Simulate receiving a message from the "worker". */
	receive(data: WorkerResponse): void {
		this.onmessage?.({ data } as MessageEvent);
	}

	/** Set a handler for messages posted TO the worker, replaying any queued messages. */
	onPosted(handler: (msg: unknown) => void): void {
		this.handler = handler;
		for (const msg of this.queued) {
			handler(msg);
		}
		this.queued = [];
	}

	static instance: MockWorker;
}

vi.stubGlobal('Worker', MockWorker);
vi.stubGlobal('navigator', { storage: { getDirectory: vi.fn() } });

/**
 * Helper: create a Datacore instance with auto-responding init + schema exec.
 */
async function createTestDatacore() {
	const dcPromise = createDatacore();

	// Auto-respond to init (ready) and exec (schema init) messages.
	MockWorker.instance.onPosted((msg: unknown) => {
		const m = msg as { id: string; type: string };
		if (m.type === 'init') {
			MockWorker.instance.receive({ id: m.id, type: 'ready' });
		} else if (m.type === 'exec') {
			MockWorker.instance.receive({
				id: m.id,
				type: 'result',
				payload: { rows: [], columns: [] },
			});
		}
	});

	return dcPromise;
}

describe('createDatacore', () => {
	beforeEach(() => {
		MockWorker.instance = undefined as unknown as MockWorker;
	});

	it('creates and initializes successfully', async () => {
		const dc = await createTestDatacore();

		expect(dc).toBeDefined();
		expect(dc.insertNode).toBeInstanceOf(Function);
		expect(dc.insertStar).toBeInstanceOf(Function);
		expect(dc.clearNodes).toBeInstanceOf(Function);
		expect(dc.clearStars).toBeInstanceOf(Function);
		expect(dc.getStarMap).toBeInstanceOf(Function);
		expect(dc.getStarsAtNode).toBeInstanceOf(Function);
		expect(dc.getNode).toBeInstanceOf(Function);
		expect(dc.getMeta).toBeInstanceOf(Function);
		expect(dc.setMeta).toBeInstanceOf(Function);
		expect(dc.transaction).toBeInstanceOf(Function);
		expect(dc.close).toBeInstanceOf(Function);
	});

	it('insertNode sends run message with node data', async () => {
		const dc = await createTestDatacore();

		let captured: { sql: string; params?: unknown[] } | null = null;
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string; payload?: { sql: string; params?: unknown[] } };
			if (m.type === 'run') {
				captured = m.payload!;
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		await dc.insertNode({ id: 1, type: 'system', x: 10, y: 20, z: 30, created_at: '2025-01-01' });

		expect(captured).not.toBeNull();
		expect(captured!.sql).toContain('INSERT INTO nodes');
		expect(captured!.params).toEqual([1, 'system', 10, 20, 30, '2025-01-01']);
	});

	it('insertStar converts is_primary boolean to integer', async () => {
		const dc = await createTestDatacore();

		let captured: { sql: string; params?: unknown[] } | null = null;
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string; payload?: { sql: string; params?: unknown[] } };
			if (m.type === 'run') {
				captured = m.payload!;
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		await dc.insertStar({
			id: 100, title: 'Sol', node_id: 1, catalog_id: 'SOL',
			spectral_class: 'G', post_type: 'helm_star',
			x: 0, y: 0, z: 0, mass: 1.0, radius: 1.0, is_primary: true,
		});

		expect(captured).not.toBeNull();
		expect(captured!.sql).toContain('INSERT INTO stars');
		// is_primary should be 1 (integer), not true (boolean)
		expect(captured!.params![11]).toBe(1);

		// Now test false → 0
		await dc.insertStar({
			id: 101, title: 'Companion', node_id: 1, catalog_id: 'COMP',
			spectral_class: 'K', post_type: 'helm_star',
			x: 0, y: 0, z: 0, mass: 0.5, radius: 0.5, is_primary: false,
		});

		expect(captured!.params![11]).toBe(0);
	});

	it('clearNodes sends DELETE FROM nodes', async () => {
		const dc = await createTestDatacore();

		let captured: { sql: string; params?: unknown[] } | null = null;
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string; payload?: { sql: string; params?: unknown[] } };
			if (m.type === 'run') {
				captured = m.payload!;
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		await dc.clearNodes();

		expect(captured).not.toBeNull();
		expect(captured!.sql).toBe('DELETE FROM nodes');
	});

	it('clearStars sends DELETE FROM stars', async () => {
		const dc = await createTestDatacore();

		let captured: { sql: string; params?: unknown[] } | null = null;
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string; payload?: { sql: string; params?: unknown[] } };
			if (m.type === 'run') {
				captured = m.payload!;
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		await dc.clearStars();

		expect(captured).not.toBeNull();
		expect(captured!.sql).toBe('DELETE FROM stars');
	});

	it('transaction sends SAVEPOINT and RELEASE on success', async () => {
		const dc = await createTestDatacore();

		const execSqls: string[] = [];
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string; payload?: { sql: string } };
			if (m.type === 'exec') {
				execSqls.push(m.payload!.sql);
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		const result = await dc.transaction(async () => 42);

		expect(result).toBe(42);
		expect(execSqls).toHaveLength(2);
		expect(execSqls[0]).toMatch(/^SAVEPOINT sp_\d+$/);
		expect(execSqls[1]).toMatch(/^RELEASE sp_\d+$/);
	});

	it('transaction sends ROLLBACK TO and RELEASE on error', async () => {
		const dc = await createTestDatacore();

		const execSqls: string[] = [];
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string; payload?: { sql: string } };
			if (m.type === 'exec') {
				execSqls.push(m.payload!.sql);
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		await expect(
			dc.transaction(async () => {
				throw new Error('Boom');
			}),
		).rejects.toThrow('Boom');

		expect(execSqls).toHaveLength(3);
		expect(execSqls[0]).toMatch(/^SAVEPOINT sp_\d+$/);
		expect(execSqls[1]).toMatch(/^ROLLBACK TO sp_\d+$/);
		expect(execSqls[2]).toMatch(/^RELEASE sp_\d+$/);
	});

	it('transaction uses unique savepoint names for nesting', async () => {
		const dc = await createTestDatacore();

		const execSqls: string[] = [];
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string; payload?: { sql: string } };
			if (m.type === 'exec') {
				execSqls.push(m.payload!.sql);
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		await dc.transaction(async () => {
			await dc.transaction(async () => 'inner');
			return 'outer';
		});

		// Outer SAVEPOINT, inner SAVEPOINT, inner RELEASE, outer RELEASE
		expect(execSqls).toHaveLength(4);
		// Extract savepoint names
		const names = execSqls
			.filter((s) => s.startsWith('SAVEPOINT'))
			.map((s) => s.replace('SAVEPOINT ', ''));
		expect(names).toHaveLength(2);
		expect(names[0]).not.toBe(names[1]);
	});

	it('getStarMap returns typed StarMapEntry[]', async () => {
		const dc = await createTestDatacore();

		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'query') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: {
						rows: [[100, 'Sol', 'SOL_1', 'G', 1.0, 2.0, 3.0, 1.0, 1.0, 'system']],
						columns: ['id', 'title', 'catalog_id', 'spectral_class', 'x', 'y', 'z', 'mass', 'radius', 'node_type'],
					},
				});
			}
		});

		const stars = await dc.getStarMap();
		expect(stars).toEqual([{
			id: 100,
			title: 'Sol',
			catalog_id: 'SOL_1',
			spectral_class: 'G',
			x: 1.0,
			y: 2.0,
			z: 3.0,
			mass: 1.0,
			radius: 1.0,
			node_type: 'system',
		}]);
	});

	it('getStarsAtNode returns Star[] with boolean is_primary', async () => {
		const dc = await createTestDatacore();

		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'query') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: {
						rows: [
							[100, 'Alpha', 10, 'ALPHA_1', 'G', 'helm_star', 1.1, 2.1, 3.1, 1.0, 1.0, 1],
							[101, 'Alpha B', 10, 'ALPHA_2', 'K', 'helm_star', 1.1, 2.1, 3.1, 0.5, 0.7, 0],
						],
						columns: ['id', 'title', 'node_id', 'catalog_id', 'spectral_class', 'post_type', 'x', 'y', 'z', 'mass', 'radius', 'is_primary'],
					},
				});
			}
		});

		const stars = await dc.getStarsAtNode(10);
		expect(stars).toHaveLength(2);
		expect(stars[0].is_primary).toBe(true);
		expect(stars[1].is_primary).toBe(false);
		expect(stars[0].node_id).toBe(10);
		expect(stars[0].title).toBe('Alpha');
	});

	it('getNode returns NavNode or null', async () => {
		const dc = await createTestDatacore();

		// First call: node exists
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'query') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: {
						rows: [[1, 'system', 10.5, 20.3, -5.1, '2025-01-01T00:00:00']],
						columns: ['id', 'type', 'x', 'y', 'z', 'created_at'],
					},
				});
			}
		});

		const node = await dc.getNode(1);
		expect(node).toEqual({
			id: 1,
			type: 'system',
			x: 10.5,
			y: 20.3,
			z: -5.1,
			created_at: '2025-01-01T00:00:00',
		});

		// Second call: node not found
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'query') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: ['id', 'type', 'x', 'y', 'z', 'created_at'] },
				});
			}
		});

		const missing = await dc.getNode(999);
		expect(missing).toBeNull();
	});

	it('getMeta and setMeta round-trip', async () => {
		const dc = await createTestDatacore();

		// setMeta sends a run message
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'run') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		await dc.setMeta('version', '42');

		// getMeta sends a query message
		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'query') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: {
						rows: [['42']],
						columns: ['value'],
					},
				});
			}
		});

		const value = await dc.getMeta('version');
		expect(value).toBe('42');
	});

	it('getMeta returns null for missing key', async () => {
		const dc = await createTestDatacore();

		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'query') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: ['value'] },
				});
			}
		});

		const value = await dc.getMeta('nonexistent');
		expect(value).toBeNull();
	});

	it('close terminates the worker', async () => {
		const dc = await createTestDatacore();

		const terminateSpy = vi.spyOn(MockWorker.instance, 'terminate');

		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'close') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'result',
					payload: { rows: [], columns: [] },
				});
			}
		});

		await dc.close();
		expect(terminateSpy).toHaveBeenCalled();
	});

	it('rejects pending requests on worker error', async () => {
		const dc = await createTestDatacore();

		// Start a getMeta call but don't respond — instead fire an error.
		const promise = dc.getMeta('key');

		MockWorker.instance.onerror?.({
			message: 'Worker crashed',
		} as ErrorEvent);

		await expect(promise).rejects.toThrow(HelmError);
		await expect(promise).rejects.toThrow(ErrorCode.DatacoreWorkerError);
	});

	it('rejects on error response from worker', async () => {
		const dc = await createTestDatacore();

		MockWorker.instance.onPosted((msg: unknown) => {
			const m = msg as { id: string; type: string };
			if (m.type === 'query') {
				MockWorker.instance.receive({
					id: m.id,
					type: 'error',
					payload: { message: 'SQL syntax error' },
				});
			}
		});

		await expect(dc.getMeta('key')).rejects.toThrow(ErrorCode.DatacoreWorkerError);
	});
});

describe('unsupported browser errors', () => {
	afterEach(() => {
		// Restore the module-level stubs for other test suites.
		vi.stubGlobal('Worker', MockWorker);
		vi.stubGlobal('navigator', { storage: { getDirectory: vi.fn() } });
	});

	it('throws HelmError when Worker is unavailable', async () => {
		vi.stubGlobal('Worker', undefined);

		await expect(createDatacore()).rejects.toThrow(HelmError);
		await expect(createDatacore()).rejects.toThrow(ErrorCode.DatacoreUnsupported);
	});

	it('throws HelmError when OPFS is unavailable', async () => {
		vi.stubGlobal('navigator', { storage: {} });

		await expect(createDatacore()).rejects.toThrow(HelmError);
		await expect(createDatacore()).rejects.toThrow(ErrorCode.DatacoreUnsupported);
	});

	it('error detail names the missing API', async () => {
		vi.stubGlobal('navigator', { storage: {} });

		try {
			await createDatacore();
		} catch (e) {
			expect(HelmError.is(e)).toBe(true);
			expect((e as HelmError).detail).toContain('Origin Private File System');
		}
	});
});
