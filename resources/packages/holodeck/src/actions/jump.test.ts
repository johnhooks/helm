import { describe, it, expect, beforeEach } from 'vitest';
import { createShip } from '../factory';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionType } from '../enums/action-type';
import { ActionError, ActionErrorCode } from './types';
import type { ActionContext } from './types';
import { jumpHandler } from './jump';
import { registerHandler } from './registry';
import { makeLoadout } from '../test-helpers';
import { createEmptyNavGraph } from '../nav-graph';

const ctx: ActionContext = { getShip: () => undefined };

beforeEach(() => {
	registerHandler(ActionType.Jump, jumpHandler);
});

function setup(config?: Parameters<typeof createShip>[3]) {
	const loadout = makeLoadout();
	const clock = createClock();
	const rng = createRng(42);
	const ship = createShip(loadout, clock, rng, { nodeId: 1, ...config });
	return { ship, clock, loadout };
}

describe('Jump Handler', () => {
	describe('validate', () => {
		it('rejects when ship has no position', () => {
			const { ship } = setup({ nodeId: null });
			expect(() => jumpHandler.validate(ship, { target_node_id: 2, distance: 1 }, ctx))
				.toThrow(ActionError);

			try {
				jumpHandler.validate(ship, { target_node_id: 2, distance: 1 }, ctx);
			} catch (e) {
				expect(e).toBeInstanceOf(ActionError);
				expect((e as ActionError).code).toBe(ActionErrorCode.ShipNoPosition);
			}
		});

		it('rejects when already at target', () => {
			const { ship } = setup();
			expect(() => jumpHandler.validate(ship, { target_node_id: 1, distance: 1 }, ctx))
				.toThrow(ActionError);

			try {
				jumpHandler.validate(ship, { target_node_id: 1, distance: 1 }, ctx);
			} catch (e) {
				expect((e as ActionError).code).toBe(ActionErrorCode.NavigationAlreadyAtTarget);
			}
		});

		it('rejects when missing target and distance', () => {
			const { ship } = setup();
			expect(() => jumpHandler.validate(ship, {}, ctx))
				.toThrow(ActionError);

			try {
				jumpHandler.validate(ship, {}, ctx);
			} catch (e) {
				expect((e as ActionError).code).toBe(ActionErrorCode.NavigationMissingTarget);
			}
		});

		it('rejects when insufficient core life', () => {
			const { ship } = setup({ coreLife: 0.001 });
			expect(() =>
				jumpHandler.validate(ship, { target_node_id: 2, distance: 10 }, ctx),
			).toThrow(ActionError);

			try {
				jumpHandler.validate(ship, { target_node_id: 2, distance: 10 }, ctx);
			} catch (e) {
				expect((e as ActionError).code).toBe(ActionErrorCode.ShipInsufficientCore);
			}
		});

		it('passes with valid params', () => {
			const { ship } = setup();
			expect(() =>
				jumpHandler.validate(ship, { target_node_id: 2, distance: 1 }, ctx),
			).not.toThrow();
		});
	});

	describe('handle', () => {
		it('computes correct duration from propulsion system', () => {
			const { ship } = setup();
			const intent = jumpHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3 },
				0,
				ctx,
			);

			const expectedDuration = ship.propulsion.getJumpDuration(3, 1.0);
			expect(intent.deferredUntil).toBe(expectedDuration);
			expect(intent.result.duration).toBe(expectedDuration);
		});

		it('computes correct core cost and power cost', () => {
			const { ship } = setup();
			const intent = jumpHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3, throttle: 0.8 },
				0,
				ctx,
			);

			const expectedCoreCost = ship.propulsion.getJumpCoreCost(3, 0.8);
			const expectedPowerCost = ship.propulsion.getJumpPowerCost(3);

			expect(intent.result.core_cost).toBe(expectedCoreCost);
			expect(intent.result.power_cost).toBe(expectedPowerCost);
		});

		it('captures from_node_id and to_node_id', () => {
			const { ship } = setup();
			const intent = jumpHandler.handle(
				ship,
				{ target_node_id: 42, distance: 2 },
				100,
				ctx,
			);

			expect(intent.result.from_node_id).toBe(1);
			expect(intent.result.to_node_id).toBe(42);
			expect(intent.result.distance).toBe(2);
		});

		it('respects throttle param', () => {
			const { ship } = setup();
			const intentFull = jumpHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3, throttle: 1.0 },
				0,
				ctx,
			);
			const intentHalf = jumpHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3, throttle: 0.5 },
				0,
				ctx,
			);

			// Lower throttle → longer duration, lower core cost
			expect(intentHalf.result.duration).toBeGreaterThan(
				intentFull.result.duration as number,
			);
			expect(intentHalf.result.core_cost).toBeLessThan(
				intentFull.result.core_cost as number,
			);
		});
	});

	describe('resolve', () => {
		it('moves ship, degrades core, consumes power', () => {
			const { ship } = setup();
			const stateBefore = ship.resolve();

			const intent = jumpHandler.handle(
				ship,
				{ target_node_id: 42, distance: 2 },
				0,
				ctx,
			);

			const action = {
				id: 1,
				shipId: stateBefore.id,
				type: ActionType.Jump,
				params: { target_node_id: 42, distance: 2 },
				status: 'pending' as const,
				createdAt: 0,
				deferredUntil: intent.deferredUntil,
				result: { ...intent.result },
			};

			const outcome = jumpHandler.resolve(ship, action, ctx);

			expect(outcome.status).toBe('fulfilled');
			const stateAfter = ship.resolve();
			expect(stateAfter.nodeId).toBe(42);
			expect(stateAfter.coreLife).toBeLessThan(stateBefore.coreLife);
			expect(stateAfter.power).toBeLessThan(stateBefore.power);
			expect(outcome.result.remaining_core_life).toBe(stateAfter.coreLife);
		});
	});

	describe('with NavGraph', () => {
		function setupWithGraph() {
			const graph = createEmptyNavGraph('test-seed');
			graph.addNode({ type: 'system', x: 0, y: 0, z: 0 }); // id 1
			graph.addNode({ type: 'system', x: 3, y: 0, z: 0 }); // id 2
			graph.addEdge(1, 2, 3.0);

			const graphCtx: ActionContext = {
				getShip: () => undefined,
				getGraph: () => graph,
			};

			const loadout = makeLoadout();
			const clock = createClock();
			const rng = createRng(42);
			const ship = createShip(loadout, clock, rng, { nodeId: 1 });
			return { ship, clock, loadout, graph, ctx: graphCtx };
		}

		it('rejects jump with no discovered edge', () => {
			const { ship, ctx: graphCtx, graph } = setupWithGraph();
			graph.addNode({ type: 'system', x: 10, y: 0, z: 0 }); // id 3, no edge to 1

			expect(() =>
				jumpHandler.validate(ship, { target_node_id: 3 }, graphCtx),
			).toThrow(ActionError);

			try {
				jumpHandler.validate(ship, { target_node_id: 3 }, graphCtx);
			} catch (e) {
				expect((e as ActionError).code).toBe(ActionErrorCode.NavigationNoRoute);
			}
		});

		it('allows jump along discovered edge', () => {
			const { ship, ctx: graphCtx } = setupWithGraph();

			expect(() =>
				jumpHandler.validate(ship, { target_node_id: 2 }, graphCtx),
			).not.toThrow();
		});

		it('uses edge distance from graph', () => {
			const { ship, ctx: graphCtx } = setupWithGraph();

			const intent = jumpHandler.handle(
				ship,
				{ target_node_id: 2 },
				0,
				graphCtx,
			);

			expect(intent.result.distance).toBe(3.0);
		});

		it('increments traversal count on resolve', () => {
			const { ship, graph, ctx: graphCtx } = setupWithGraph();

			const intent = jumpHandler.handle(
				ship,
				{ target_node_id: 2 },
				0,
				graphCtx,
			);

			const action = {
				id: 1,
				shipId: ship.resolve().id,
				type: ActionType.Jump,
				params: { target_node_id: 2 },
				status: 'pending' as const,
				createdAt: 0,
				deferredUntil: intent.deferredUntil,
				result: { ...intent.result },
			};

			expect(graph.getEdge(1, 2)!.traversals).toBe(0);
			jumpHandler.resolve(ship, action, graphCtx);
			expect(graph.getEdge(1, 2)!.traversals).toBe(1);
		});
	});
});
