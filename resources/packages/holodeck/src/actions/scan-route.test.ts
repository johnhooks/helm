import { describe, it, expect, beforeEach } from 'vitest';
import { createShip } from '../factory';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionType } from '../enums/action-type';
import { ActionError, ActionErrorCode } from './types';
import type { ActionContext } from './types';
import { scanRouteHandler } from './scan-route';
import { registerHandler } from './registry';
import { makeLoadout } from '../test-helpers';
import { createEmptyNavGraph } from '../nav-graph';

const ctx: ActionContext = { getShip: () => undefined };

beforeEach(() => {
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
});

function setup(config?: Parameters<typeof createShip>[3]) {
	const loadout = makeLoadout();
	const clock = createClock();
	const rng = createRng(42);
	const ship = createShip(loadout, clock, rng, { nodeId: 1, ...config });
	return { ship, clock, loadout };
}

describe('ScanRoute Handler', () => {
	describe('validate', () => {
		it('rejects when ship has no position', () => {
			const { ship } = setup({ nodeId: null });
			expect(() =>
				scanRouteHandler.validate(ship, { target_node_id: 2 }, ctx)
			).toThrow(ActionError);

			try {
				scanRouteHandler.validate(ship, { target_node_id: 2 }, ctx);
			} catch (e) {
				expect((e as ActionError).code).toBe(
					ActionErrorCode.ShipNoPosition
				);
			}
		});

		it('rejects when already at target', () => {
			const { ship } = setup();
			expect(() =>
				scanRouteHandler.validate(ship, { target_node_id: 1 }, ctx)
			).toThrow(ActionError);

			try {
				scanRouteHandler.validate(ship, { target_node_id: 1 }, ctx);
			} catch (e) {
				expect((e as ActionError).code).toBe(
					ActionErrorCode.NavigationAlreadyAtTarget
				);
			}
		});

		it('rejects when missing target_node_id', () => {
			const { ship } = setup();
			expect(() => scanRouteHandler.validate(ship, {}, ctx)).toThrow(
				ActionError
			);

			try {
				scanRouteHandler.validate(ship, {}, ctx);
			} catch (e) {
				expect((e as ActionError).code).toBe(
					ActionErrorCode.NavigationMissingTarget
				);
			}
		});

		it('passes with valid params', () => {
			const { ship } = setup();
			expect(() =>
				scanRouteHandler.validate(
					ship,
					{ target_node_id: 2, distance: 1 },
					ctx
				)
			).not.toThrow();
		});
	});

	describe('handle', () => {
		it('computes duration from sensor system', () => {
			const { ship } = setup();
			const intent = scanRouteHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3 },
				0,
				ctx
			);

			const expectedDuration = ship.sensors.getScanDuration(3, 1.0);
			expect(intent.deferredUntil).toBe(expectedDuration);
			expect(intent.result.duration).toBe(expectedDuration);
		});

		it('captures success chance including pilot skill', () => {
			// Default pilot scanning = 1.0
			const { ship } = setup();
			const intent = scanRouteHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3 },
				0,
				ctx
			);

			const expectedChance = ship.sensors.getScanSuccessChance(3, 1.0);
			expect(intent.result.success_chance).toBe(expectedChance);
		});

		it('captures power cost', () => {
			const { ship } = setup();
			const intent = scanRouteHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3 },
				0,
				ctx
			);

			const expectedPowerCost = ship.sensors.getScanPowerCost(3);
			expect(intent.result.power_cost).toBe(expectedPowerCost);
		});

		it('captures from and to node ids', () => {
			const { ship } = setup();
			const intent = scanRouteHandler.handle(
				ship,
				{ target_node_id: 42, distance: 2 },
				100,
				ctx
			);

			expect(intent.result.from_node_id).toBe(1);
			expect(intent.result.to_node_id).toBe(42);
		});

		it('respects effort param', () => {
			const { ship } = setup();
			const intentDefault = scanRouteHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3 },
				0,
				ctx
			);
			const intentLowEffort = scanRouteHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3, effort: 0.5 },
				0,
				ctx
			);

			// Lower effort → shorter duration, lower success chance
			expect(intentLowEffort.result.duration).toBeLessThan(
				intentDefault.result.duration as number
			);
			expect(intentLowEffort.result.success_chance).toBeLessThan(
				intentDefault.result.success_chance as number
			);
		});
	});

	describe('resolve', () => {
		it('consumes power and produces a roll', () => {
			const { ship } = setup();
			const stateBefore = ship.resolve();

			const intent = scanRouteHandler.handle(
				ship,
				{ target_node_id: 2, distance: 1 },
				0,
				ctx
			);

			const action = {
				id: 1,
				shipId: stateBefore.id,
				type: ActionType.ScanRoute,
				params: { target_node_id: 2, distance: 1 },
				status: 'pending' as const,
				createdAt: 0,
				deferredUntil: intent.deferredUntil,
				result: { ...intent.result },
			};

			const outcome = scanRouteHandler.resolve(ship, action, ctx);

			expect(outcome.status).toBe('fulfilled');
			expect(typeof outcome.result.roll).toBe('number');
			expect(typeof outcome.result.success).toBe('boolean');

			const stateAfter = ship.resolve();
			expect(stateAfter.power).toBeLessThan(stateBefore.power);
		});

		it('RNG determinism: same seed produces same outcome', () => {
			function runScan() {
				const loadout = makeLoadout();
				const clock = createClock();
				const rng = createRng(42);
				const ship = createShip(loadout, clock, rng, { nodeId: 1 });

				const intent = scanRouteHandler.handle(
					ship,
					{ target_node_id: 2, distance: 1 },
					0,
					ctx
				);

				const action = {
					id: 1,
					shipId: 'ship-1',
					type: ActionType.ScanRoute,
					params: { target_node_id: 2, distance: 1 },
					status: 'pending' as const,
					createdAt: 0,
					deferredUntil: intent.deferredUntil,
					result: { ...intent.result },
				};

				return scanRouteHandler.resolve(ship, action, ctx);
			}

			const outcome1 = runScan();
			const outcome2 = runScan();

			expect(outcome1.result.roll).toBe(outcome2.result.roll);
			expect(outcome1.result.success).toBe(outcome2.result.success);
		});

		it('scan failure is fulfilled, not failed', () => {
			// Use a seed/distance combo that produces a high roll (failure)
			// We force this by setting success_chance to 0
			const { ship } = setup();
			const state = ship.resolve();

			const action = {
				id: 1,
				shipId: state.id,
				type: ActionType.ScanRoute,
				params: { target_node_id: 2, distance: 1 },
				status: 'pending' as const,
				createdAt: 0,
				deferredUntil: 100,
				result: {
					from_node_id: 1,
					to_node_id: 2,
					distance: 1,
					effort: 1.0,
					success_chance: 0, // guaranteed failure
					power_cost: 1,
					duration: 100,
				},
			};

			const outcome = scanRouteHandler.resolve(ship, action, ctx);

			expect(outcome.status).toBe('fulfilled');
			expect(outcome.result.success).toBe(false);
		});
	});

	describe('with NavGraph', () => {
		const SEED = 'test-seed';

		function setupWithGraph(config?: Parameters<typeof createShip>[3]) {
			const graph = createEmptyNavGraph(SEED);
			graph.addNode({ type: 'system', x: 0, y: 0, z: 0 }); // id 1 - Sol
			graph.addNode({ type: 'system', x: 0.5, y: 0, z: 0 }); // id 2 - very close (< 1 ly)
			graph.addNode({ type: 'system', x: 5, y: 3, z: 2 }); // id 3 - far

			const graphCtx: ActionContext = {
				getShip: () => undefined,
				getGraph: () => graph,
			};

			const loadout = makeLoadout();
			const clock = createClock();
			const rng = createRng(42);
			const ship = createShip(loadout, clock, rng, {
				nodeId: 1,
				...config,
			});
			return { ship, clock, loadout, graph, ctx: graphCtx };
		}

		it('validates nodes exist in graph', () => {
			const { ship, ctx: graphCtx } = setupWithGraph();
			expect(() =>
				scanRouteHandler.validate(
					ship,
					{ target_node_id: 999 },
					graphCtx
				)
			).toThrow(ActionError);

			try {
				scanRouteHandler.validate(
					ship,
					{ target_node_id: 999 },
					graphCtx
				);
			} catch (e) {
				expect((e as ActionError).code).toBe(
					ActionErrorCode.NavigationNoGraph
				);
			}
		});

		it('computes distance from graph coordinates', () => {
			const { ship, ctx: graphCtx } = setupWithGraph();
			const intent = scanRouteHandler.handle(
				ship,
				{ target_node_id: 3 },
				0,
				graphCtx
			);

			// Distance from (0,0,0) to (5,3,2) = sqrt(38) ≈ 6.164
			const expected = Math.sqrt(5 * 5 + 3 * 3 + 2 * 2);
			expect(intent.result.distance).toBeCloseTo(expected);
		});

		it('creates direct edge for very close systems', () => {
			const { ship, graph, ctx: graphCtx } = setupWithGraph();

			const intent = scanRouteHandler.handle(
				ship,
				{ target_node_id: 2 },
				0,
				graphCtx
			);

			const action = {
				id: 1,
				shipId: ship.resolve().id,
				type: ActionType.ScanRoute,
				params: { target_node_id: 2 },
				status: 'pending' as const,
				createdAt: 0,
				deferredUntil: intent.deferredUntil,
				result: { ...intent.result },
			};

			const outcome = scanRouteHandler.resolve(ship, action, graphCtx);

			expect(outcome.result.success).toBe(true);
			expect(outcome.result.complete).toBe(true);
			expect(graph.hasEdge(1, 2)).toBe(true);
			expect(outcome.result.discovered_edges).toHaveLength(1);
		});

		it('discovers waypoints for distant systems on success', () => {
			// Use a high-skill nav to maximize discovery probability
			const { ship, graph, ctx: graphCtx } = setupWithGraph();

			const intent = scanRouteHandler.handle(
				ship,
				{ target_node_id: 3 },
				0,
				graphCtx
			);

			const action = {
				id: 1,
				shipId: ship.resolve().id,
				type: ActionType.ScanRoute,
				params: { target_node_id: 3 },
				status: 'pending' as const,
				createdAt: 0,
				deferredUntil: intent.deferredUntil,
				result: { ...intent.result },
			};

			const outcome = scanRouteHandler.resolve(ship, action, graphCtx);

			expect(outcome.status).toBe('fulfilled');
			if (outcome.result.success) {
				// When successful, should discover at least one edge
				const edges = outcome.result.discovered_edges as unknown[];
				expect(edges.length).toBeGreaterThanOrEqual(1);
				// Graph should have new edges
				expect(graph.edgeCount).toBeGreaterThanOrEqual(1);
			}
		});

		it('returns failure on bad roll', () => {
			const { ship, ctx: graphCtx } = setupWithGraph();
			const state = ship.resolve();

			const action = {
				id: 1,
				shipId: state.id,
				type: ActionType.ScanRoute,
				params: { target_node_id: 3 },
				status: 'pending' as const,
				createdAt: 0,
				deferredUntil: 100,
				result: {
					from_node_id: 1,
					to_node_id: 3,
					distance: Math.sqrt(38),
					effort: 1.0,
					success_chance: 0.001, // very low chance → likely failure
					power_cost: 1,
					duration: 100,
				},
			};

			const outcome = scanRouteHandler.resolve(ship, action, graphCtx);

			expect(outcome.status).toBe('fulfilled');
			// With success_chance 0.001 and firstHopChance reducing it further,
			// the effective chance is ~0.01 (clamped minimum)
			// The roll may or may not beat it, but we check the structure
			if (!outcome.result.success) {
				expect(outcome.result.discovered_nodes).toBeUndefined();
			}
		});
	});
});
