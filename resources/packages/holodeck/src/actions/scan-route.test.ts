import { describe, it, expect, beforeEach } from 'vitest';
import { createShip } from '../factory';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionType } from '../enums/action-type';
import { ActionError, ActionErrorCode } from './types';
import { scanRouteHandler } from './scan-route';
import { registerHandler } from './registry';
import { makeLoadout } from '../test-helpers';

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
				scanRouteHandler.validate(ship, { target_node_id: 2 }),
			).toThrow(ActionError);

			try {
				scanRouteHandler.validate(ship, { target_node_id: 2 });
			} catch (e) {
				expect((e as ActionError).code).toBe(ActionErrorCode.ShipNoPosition);
			}
		});

		it('rejects when already at target', () => {
			const { ship } = setup();
			expect(() =>
				scanRouteHandler.validate(ship, { target_node_id: 1 }),
			).toThrow(ActionError);

			try {
				scanRouteHandler.validate(ship, { target_node_id: 1 });
			} catch (e) {
				expect((e as ActionError).code).toBe(
					ActionErrorCode.NavigationAlreadyAtTarget,
				);
			}
		});

		it('rejects when missing target_node_id', () => {
			const { ship } = setup();
			expect(() => scanRouteHandler.validate(ship, {})).toThrow(ActionError);

			try {
				scanRouteHandler.validate(ship, {});
			} catch (e) {
				expect((e as ActionError).code).toBe(
					ActionErrorCode.NavigationMissingTarget,
				);
			}
		});

		it('passes with valid params', () => {
			const { ship } = setup();
			expect(() =>
				scanRouteHandler.validate(ship, { target_node_id: 2, distance: 1 }),
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
			);
			const intentLowEffort = scanRouteHandler.handle(
				ship,
				{ target_node_id: 2, distance: 3, effort: 0.5 },
				0,
			);

			// Lower effort → shorter duration, lower success chance
			expect(intentLowEffort.result.duration).toBeLessThan(
				intentDefault.result.duration as number,
			);
			expect(intentLowEffort.result.success_chance).toBeLessThan(
				intentDefault.result.success_chance as number,
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

			const outcome = scanRouteHandler.resolve(ship, action);

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

				return scanRouteHandler.resolve(ship, action);
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

			const outcome = scanRouteHandler.resolve(ship, action);

			expect(outcome.status).toBe('fulfilled');
			expect(outcome.result.success).toBe(false);
		});
	});
});
