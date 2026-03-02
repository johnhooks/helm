import { describe, it, expect, beforeEach } from 'vitest';
import { createShip } from '../factory';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionType } from '../enums/action-type';
import { ActionStatus } from '../enums/action-status';
import { ActionError, ActionErrorCode } from './types';
import { jumpHandler } from './jump';
import { scanRouteHandler } from './scan-route';
import { registerHandler } from './registry';
import { createEngine } from './engine';
import { makeLoadout } from '../test-helpers';
import { createEmptyNavGraph } from '../nav-graph';

beforeEach(() => {
	registerHandler(ActionType.Jump, jumpHandler);
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
});

function setup(config?: Parameters<typeof createShip>[3]) {
	const clock = createClock();
	const engine = createEngine(clock);
	const loadout = makeLoadout();
	const rng = createRng(42);
	const ship = createShip(loadout, clock, rng, { nodeId: 1, ...config });
	return { engine, ship, clock, loadout };
}

describe('Engine — Action Lifecycle', () => {
	it('submit returns pending, advance resolves to fulfilled', () => {
		const { engine, ship, clock } = setup();

		const action = engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 2,
		});

		expect(action.status).toBe(ActionStatus.Pending);
		expect(action.deferredUntil).toBeGreaterThan(0);
		expect(action.result.from_node_id).toBe(1);
		expect(action.result.to_node_id).toBe(42);

		// Advance past deferred time
		const resolved = engine.advance(action.deferredUntil! - clock.now());
		expect(resolved).toHaveLength(1);
		expect(resolved[0].status).toBe(ActionStatus.Fulfilled);

		const state = ship.resolve();
		expect(state.nodeId).toBe(42);
	});

	it('one-at-a-time: second submit throws action.in_progress', () => {
		const { engine, ship } = setup();

		engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 2,
		});

		expect(() =>
			engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 43,
				distance: 1,
			}),
		).toThrow(ActionError);

		try {
			engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 43,
				distance: 1,
			});
		} catch (e) {
			expect((e as ActionError).code).toBe(ActionErrorCode.ActionInProgress);
		}
	});

	it('slot clears on completion: submit jump, advance, submit scan succeeds', () => {
		const { engine, ship } = setup();

		const jump = engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 1,
		});

		engine.advance(jump.deferredUntil!);

		// Ship is now at node 42, slot is clear
		expect(engine.getCurrentAction(ship)).toBeNull();

		const scan = engine.submitAction(ship, ActionType.ScanRoute, {
			target_node_id: 43,
			distance: 1,
		});

		expect(scan.status).toBe(ActionStatus.Pending);
		expect(scan.type).toBe(ActionType.ScanRoute);
	});

	it('partial advance: submit 2-step, advance partway, then finish', () => {
		const { engine, ship, clock } = setup();

		const action = engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 2,
		});

		const totalTime = action.deferredUntil!;
		const halfTime = totalTime / 2;

		// Advance halfway — should not resolve
		const firstAdvance = engine.advance(halfTime);
		expect(firstAdvance).toHaveLength(0);
		expect(engine.getCurrentAction(ship)!.status).toBe(ActionStatus.Pending);
		expect(ship.resolve().nodeId).toBe(1); // still at origin

		// Advance the rest — should resolve
		const secondAdvance = engine.advance(totalTime - clock.now());
		expect(secondAdvance).toHaveLength(1);
		expect(secondAdvance[0].status).toBe(ActionStatus.Fulfilled);
		expect(ship.resolve().nodeId).toBe(42);
	});

	it('advanceUntilIdle: jumps to exact deferredUntil', () => {
		const { engine, ship, clock } = setup();

		const action = engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 2,
		});

		const resolved = engine.advanceUntilIdle();
		expect(resolved).toHaveLength(1);
		expect(resolved[0].status).toBe(ActionStatus.Fulfilled);
		expect(clock.now()).toBe(action.deferredUntil);
		expect(ship.resolve().nodeId).toBe(42);
		expect(engine.getCurrentAction(ship)).toBeNull();
	});

	it('getCurrentAction returns the pending action', () => {
		const { engine, ship } = setup();

		expect(engine.getCurrentAction(ship)).toBeNull();

		const action = engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 1,
		});

		const current = engine.getCurrentAction(ship);
		expect(current).not.toBeNull();
		expect(current!.id).toBe(action.id);
		expect(current!.status).toBe(ActionStatus.Pending);
	});

	it('getActions returns full action history', () => {
		const { engine, ship } = setup();

		expect(engine.getActions(ship)).toHaveLength(0);

		engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 1,
		});
		engine.advanceUntilIdle();

		engine.submitAction(ship, ActionType.ScanRoute, {
			target_node_id: 43,
			distance: 1,
		});

		const actions = engine.getActions(ship);
		expect(actions).toHaveLength(2);
		expect(actions[0].type).toBe(ActionType.Jump);
		expect(actions[0].status).toBe(ActionStatus.Fulfilled);
		expect(actions[1].type).toBe(ActionType.ScanRoute);
		expect(actions[1].status).toBe(ActionStatus.Pending);
	});

	describe('previewAction', () => {
		it('valid preview returns intent and projected state', () => {
			const { engine, ship } = setup();
			const stateBefore = ship.resolve();

			const preview = engine.previewAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			expect(preview.valid).toBe(true);
			expect(preview.intent).toBeDefined();
			expect(preview.intent!.deferredUntil).toBeGreaterThan(0);
			expect(preview.projectedState).toBeDefined();
			expect(preview.projectedState!.nodeId).toBe(42);
			expect(preview.projectedState!.coreLife).toBeLessThan(
				stateBefore.coreLife,
			);

			// Real ship must NOT be mutated
			const stateAfter = ship.resolve();
			expect(stateAfter.nodeId).toBe(1);
			expect(stateAfter.coreLife).toBe(stateBefore.coreLife);
			expect(stateAfter.power).toBe(stateBefore.power);
		});

		it('invalid preview returns valid: false with error', () => {
			const { engine, ship } = setup({ nodeId: null });

			const preview = engine.previewAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 1,
			});

			expect(preview.valid).toBe(false);
			expect(preview.error).toBeDefined();
			expect(preview.intent).toBeUndefined();
			expect(preview.projectedState).toBeUndefined();
		});

		it('does not consume real RNG', () => {
			const { engine, ship } = setup();

			// Preview uses a throwaway RNG — real ship's RNG is untouched
			engine.previewAction(ship, ActionType.ScanRoute, {
				target_node_id: 2,
				distance: 1,
			});

			// Submit a real scan and verify the RNG produces the expected
			// first value (same as a fresh seed-42 RNG)
			const action = engine.submitAction(ship, ActionType.ScanRoute, {
				target_node_id: 2,
				distance: 1,
			});
			engine.advanceUntilIdle();

			const freshRng = createRng(42);
			const expectedRoll = freshRng.next();
			expect(action.result.roll).toBe(expectedRoll);
		});
	});

	it('multiple actions in sequence with accumulated state changes', () => {
		const { engine, ship } = setup();
		const initialState = ship.resolve();

		// Jump 1: node 1 → 42
		engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 2,
		});
		engine.advanceUntilIdle();

		expect(ship.resolve().nodeId).toBe(42);
		const afterJump1 = ship.resolve();
		expect(afterJump1.coreLife).toBeLessThan(initialState.coreLife);

		// Scan from node 42
		engine.submitAction(ship, ActionType.ScanRoute, {
			target_node_id: 43,
			distance: 1,
		});
		engine.advanceUntilIdle();

		const afterScan = ship.resolve();
		expect(afterScan.nodeId).toBe(42); // scan doesn't move

		// Jump 2: node 42 → 99
		engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 99,
			distance: 1,
		});
		engine.advanceUntilIdle();

		const finalState = ship.resolve();
		expect(finalState.nodeId).toBe(99);
		expect(finalState.coreLife).toBeLessThan(afterJump1.coreLife);

		// All 3 actions in history
		expect(engine.getActions(ship)).toHaveLength(3);
		expect(
			engine.getActions(ship).every((a) => a.status === ActionStatus.Fulfilled),
		).toBe(true);
	});

	it('action IDs auto-increment', () => {
		const { engine, ship } = setup();

		const a1 = engine.submitAction(ship, ActionType.Jump, {
			target_node_id: 42,
			distance: 1,
		});
		engine.advanceUntilIdle();

		const a2 = engine.submitAction(ship, ActionType.ScanRoute, {
			target_node_id: 43,
			distance: 1,
		});
		engine.advanceUntilIdle();

		expect(a1.id).toBe(1);
		expect(a2.id).toBe(2);
	});

	it('throws for unregistered action type', () => {
		const { engine, ship } = setup();

		expect(() =>
			engine.submitAction(ship, 'unknown_type' as ActionType, {}),
		).toThrow(ActionError);

		try {
			engine.submitAction(ship, 'unknown_type' as ActionType, {});
		} catch (e) {
			expect((e as ActionError).code).toBe(ActionErrorCode.ActionNoHandler);
		}
	});

	describe('with NavGraph — scan then jump', () => {
		it('full exploration loop: scan discovers edge, then jump along it', () => {
			// Build a graph with two close nodes (< 1ly = direct jump possible)
			const graph = createEmptyNavGraph('integration-seed');
			graph.addNode({ type: 'system', x: 0, y: 0, z: 0 }); // id 1 (Sol)
			graph.addNode({ type: 'system', x: 0.5, y: 0.3, z: 0 }); // id 2 (close neighbor)

			const clock = createClock();
			const engine = createEngine(clock, graph);
			const loadout = makeLoadout();
			const rng = createRng(42);
			const ship = createShip(loadout, clock, rng, { nodeId: 1 });

			// No edge initially
			expect(graph.hasEdge(1, 2)).toBe(false);

			// Scan toward node 2 (close enough for direct jump → always succeeds)
			const scanAction = engine.submitAction(ship, ActionType.ScanRoute, {
				target_node_id: 2,
			});
			engine.advanceUntilIdle();

			expect(scanAction.result.success).toBe(true);
			expect(scanAction.result.complete).toBe(true);
			// Edge should now exist
			expect(graph.hasEdge(1, 2)).toBe(true);

			// Ship is still at node 1 (scan doesn't move)
			expect(ship.resolve().nodeId).toBe(1);

			// Now jump along the discovered edge
			const jumpAction = engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 2,
			});
			engine.advanceUntilIdle();

			expect(jumpAction.status).toBe(ActionStatus.Fulfilled);
			expect(ship.resolve().nodeId).toBe(2);

			// Traversal count incremented
			expect(graph.getEdge(1, 2)!.traversals).toBe(1);
		});

		it('jump is rejected when no edge exists', () => {
			const graph = createEmptyNavGraph('test');
			graph.addNode({ type: 'system', x: 0, y: 0, z: 0 }); // id 1
			graph.addNode({ type: 'system', x: 5, y: 0, z: 0 }); // id 2, no edge

			const clock = createClock();
			const engine = createEngine(clock, graph);
			const loadout = makeLoadout();
			const rng = createRng(42);
			const ship = createShip(loadout, clock, rng, { nodeId: 1 });

			expect(() =>
				engine.submitAction(ship, ActionType.Jump, { target_node_id: 2 }),
			).toThrow(ActionError);

			try {
				engine.submitAction(ship, ActionType.Jump, { target_node_id: 2 });
			} catch (e) {
				expect((e as ActionError).code).toBe(ActionErrorCode.NavigationNoRoute);
			}
		});
	});
});
