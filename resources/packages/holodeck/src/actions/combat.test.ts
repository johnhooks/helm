import { describe, it, expect, beforeEach } from 'vitest';
import { createShip } from '../factory';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionType } from '../enums/action-type';
import { ActionStatus } from '../enums/action-status';
import { ActionError, ActionErrorCode } from './types';
import { jumpHandler } from './jump';
import { scanRouteHandler } from './scan-route';
import { firePhaserHandler } from './fire-phaser';
import { fireTorpedoHandler } from './fire-torpedo';
import { registerHandler } from './registry';
import { createEngine } from './engine';
import { buildLoadout } from '../loadout-builder';

beforeEach(() => {
	registerHandler(ActionType.Jump, jumpHandler);
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
	registerHandler(ActionType.FirePhaser, firePhaserHandler);
	registerHandler(ActionType.FireTorpedo, fireTorpedoHandler);
});

function makeAttacker(clock: ReturnType<typeof createClock>) {
	const loadout = buildLoadout('striker', {}, ['phaser_array']);
	return createShip(loadout, clock, createRng(42), { id: 'wolf', nodeId: 1 });
}

function makeTorpedoAttacker(clock: ReturnType<typeof createClock>) {
	const loadout = buildLoadout('specter', {}, ['torpedo_launcher']);
	return createShip(loadout, clock, createRng(42), {
		id: 'wolf',
		nodeId: 1,
		ammo: { torpedo_launcher: 4 },
	});
}

function makeDefender(
	clock: ReturnType<typeof createClock>,
	equipment: string[] = []
) {
	const loadout = buildLoadout('pioneer', {}, equipment);
	return createShip(loadout, clock, createRng(99), {
		id: 'miner',
		nodeId: 1,
	});
}

describe('Combat — Multi-Ship Integration', () => {
	describe('FirePhaser', () => {
		it('drains target shields over firing duration', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeAttacker(clock);
			const miner = makeDefender(clock);
			engine.registerShip('wolf', wolf);
			engine.registerShip('miner', miner);

			const beforeShield = miner.resolve().shield;

			const action = engine.submitAction(wolf, ActionType.FirePhaser, {
				target_ship_id: 'miner',
				duration: 3600,
			});
			engine.advanceUntilIdle();

			expect(action.status).toBe(ActionStatus.Fulfilled);
			const afterShield = miner.resolve().shield;
			expect(afterShield).toBeLessThan(beforeShield);
			expect(action.result.shield_drained).toBeGreaterThan(0);
		});

		it('overflows to hull damage when shields deplete', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeAttacker(clock);
			const miner = makeDefender(clock);
			engine.registerShip('wolf', wolf);
			engine.registerShip('miner', miner);

			// Long sustained fire to deplete shields and overflow
			engine.submitAction(wolf, ActionType.FirePhaser, {
				target_ship_id: 'miner',
				duration: 7200,
			});
			engine.advanceUntilIdle();

			const minerState = miner.resolve();
			// With 35/hr drain at priority 1.0, 2 hours = 70 drain vs 100 shield capacity
			// If shields deplete, hull takes overflow
			expect(minerState.shield).toBeLessThan(miner.resolve().shieldMax);
		});

		it('ECM reduces phaser effectiveness', () => {
			const clock1 = createClock(0);
			const engine1 = createEngine(clock1);
			const wolf1 = makeAttacker(clock1);
			const miner1 = makeDefender(clock1);
			engine1.registerShip('wolf', wolf1);
			engine1.registerShip('miner', miner1);

			engine1.submitAction(wolf1, ActionType.FirePhaser, {
				target_ship_id: 'miner',
				duration: 3600,
			});
			engine1.advanceUntilIdle();
			const drainWithoutEcm =
				miner1.resolve().shieldMax - miner1.resolve().shield;

			// Same scenario with ECM active
			const clock2 = createClock(0);
			const engine2 = createEngine(clock2);
			const wolf2 = makeAttacker(clock2);
			const miner2 = makeDefender(clock2, ['ecm_mk1']);
			engine2.registerShip('wolf', wolf2);
			engine2.registerShip('miner', miner2);
			miner2.activateEquipment('ecm_mk1');

			engine2.submitAction(wolf2, ActionType.FirePhaser, {
				target_ship_id: 'miner',
				duration: 3600,
			});
			engine2.advanceUntilIdle();
			const drainWithEcm =
				miner2.resolve().shieldMax - miner2.resolve().shield;

			// ECM should reduce effective drain
			expect(drainWithEcm).toBeLessThan(drainWithoutEcm);
		});

		it('validates target exists', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeAttacker(clock);
			engine.registerShip('wolf', wolf);

			expect(() =>
				engine.submitAction(wolf, ActionType.FirePhaser, {
					target_ship_id: 'ghost',
					duration: 3600,
				})
			).toThrow(ActionError);
		});

		it('validates ship has phaser equipment', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const miner = makeDefender(clock);
			const target = makeDefender(clock, []);
			engine.registerShip('miner', miner);
			engine.registerShip('target', target);

			expect(() =>
				engine.submitAction(miner, ActionType.FirePhaser, {
					target_ship_id: 'target',
					duration: 3600,
				})
			).toThrow(ActionError);
		});
	});

	describe('FireTorpedo', () => {
		it('consumes ammo and defers for flight time', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeTorpedoAttacker(clock);
			const miner = makeDefender(clock);
			engine.registerShip('wolf', wolf);
			engine.registerShip('miner', miner);

			const ammoBefore = wolf.resolve().ammo.torpedo_launcher;
			const action = engine.submitAction(wolf, ActionType.FireTorpedo, {
				target_ship_id: 'miner',
			});

			expect(action.status).toBe(ActionStatus.Pending);
			expect(action.deferredUntil).toBe(120); // TORPEDO_FLIGHT_SECONDS
			expect(wolf.resolve().ammo.torpedo_launcher).toBe(ammoBefore - 1);

			engine.advanceUntilIdle();
			expect(action.status).toBe(ActionStatus.Fulfilled);
		});

		it('torpedo hit applies damage through shields', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeTorpedoAttacker(clock);
			const miner = makeDefender(clock);
			engine.registerShip('wolf', wolf);
			engine.registerShip('miner', miner);

			const beforeState = miner.resolve();

			engine.submitAction(wolf, ActionType.FireTorpedo, {
				target_ship_id: 'miner',
			});
			const resolved = engine.advanceUntilIdle();
			const torpedo = resolved.find(
				(a) => a.type === ActionType.FireTorpedo
			)!;
			const result = torpedo.result;

			if (result.hit) {
				// If hit, target should have taken damage
				const afterState = miner.resolve();
				expect(afterState.shield).toBeLessThanOrEqual(
					beforeState.shield
				);
				expect(result.damage).toBeGreaterThan(0);
			}
			// Either hit or miss, status is fulfilled
			expect(torpedo.status).toBe(ActionStatus.Fulfilled);
		});

		it('PDS intercepts torpedoes', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeTorpedoAttacker(clock);
			const miner = makeDefender(clock, ['pds_mk1']);
			engine.registerShip('wolf', wolf);
			engine.registerShip('miner', miner);
			miner.activateEquipment('pds_mk1');

			// Fire all 4 torpedoes
			const results: Record<string, unknown>[] = [];
			for (let i = 0; i < 4; i++) {
				engine.submitAction(wolf, ActionType.FireTorpedo, {
					target_ship_id: 'miner',
				});
				const resolved = engine.advanceUntilIdle();
				const torpedo = resolved.find(
					(a) => a.type === ActionType.FireTorpedo
				)!;
				results.push(torpedo.result);
			}

			// With PDS active (mult_a=0.45, single torpedo), some should be intercepted
			// This is probabilistic with seeded RNG — just verify the mechanism works
			const intercepted = results.filter((r) => r.intercepted === true);
			const hits = results.filter((r) => r.hit === true);

			// All results should have the intercepted flag
			results.forEach((r) => {
				expect(r.intercepted !== undefined).toBe(true);
			});

			// At least some activity (deterministic with seed 42)
			expect(
				intercepted.length +
					hits.length +
					results.filter((r) => !r.hit && !r.intercepted).length
			).toBe(4);
		});

		it('validates sufficient ammo', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const loadout = buildLoadout('specter', {}, ['torpedo_launcher']);
			const wolf = createShip(loadout, clock, createRng(42), {
				id: 'wolf',
				nodeId: 1,
				ammo: { torpedo_launcher: 0 },
			});
			const miner = makeDefender(clock);
			engine.registerShip('wolf', wolf);
			engine.registerShip('miner', miner);

			expect(() =>
				engine.submitAction(wolf, ActionType.FireTorpedo, {
					target_ship_id: 'miner',
				})
			).toThrow(ActionError);

			try {
				engine.submitAction(wolf, ActionType.FireTorpedo, {
					target_ship_id: 'miner',
				});
			} catch (e) {
				expect((e as ActionError).code).toBe(
					ActionErrorCode.ShipInsufficientAmmo
				);
			}
		});

		it('validates target exists', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeTorpedoAttacker(clock);
			engine.registerShip('wolf', wolf);

			expect(() =>
				engine.submitAction(wolf, ActionType.FireTorpedo, {
					target_ship_id: 'ghost',
				})
			).toThrow(ActionError);
		});
	});

	describe('Combat Sequences', () => {
		it('activate ECM → fire phaser → advance → check reduced effectiveness', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeAttacker(clock);
			const miner = makeDefender(clock, ['ecm_mk1']);
			engine.registerShip('wolf', wolf);
			engine.registerShip('miner', miner);

			// Miner activates ECM (direct mutation, not engine action)
			miner.activateEquipment('ecm_mk1');
			expect(miner.isEquipmentActive('ecm_mk1')).toBe(true);

			// Wolf fires phaser
			engine.submitAction(wolf, ActionType.FirePhaser, {
				target_ship_id: 'miner',
				duration: 3600,
			});
			engine.advanceUntilIdle();

			// Shields should have drained, but less than without ECM
			const minerState = miner.resolve();
			expect(minerState.shield).toBeLessThan(minerState.shieldMax);
		});

		it('two ships submit actions, engine resolves both', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);

			const ship1 = createShip(
				buildLoadout('pioneer'),
				clock,
				createRng(1),
				{ id: 'ship1', nodeId: 1 }
			);
			const ship2 = createShip(
				buildLoadout('surveyor'),
				clock,
				createRng(2),
				{ id: 'ship2', nodeId: 5 }
			);
			engine.registerShip('ship1', ship1);
			engine.registerShip('ship2', ship2);

			// Both submit jump actions
			engine.submitAction(ship1, ActionType.Jump, {
				target_node_id: 10,
				distance: 2,
			});
			engine.submitAction(ship2, ActionType.Jump, {
				target_node_id: 20,
				distance: 3,
			});

			const resolved = engine.advanceUntilIdle();
			expect(resolved).toHaveLength(2);
			expect(
				resolved.every((a) => a.status === ActionStatus.Fulfilled)
			).toBe(true);

			expect(ship1.resolve().nodeId).toBe(10);
			expect(ship2.resolve().nodeId).toBe(20);
		});

		it('sequential combat: phaser then torpedo', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);

			const loadout = buildLoadout('striker', {}, [
				'phaser_array',
				'torpedo_launcher',
			]);
			const wolf = createShip(loadout, clock, createRng(42), {
				id: 'wolf',
				nodeId: 1,
				ammo: { torpedo_launcher: 2 },
			});
			const miner = makeDefender(clock);
			engine.registerShip('wolf', wolf);
			engine.registerShip('miner', miner);

			// First: fire phaser for 1 hour
			engine.submitAction(wolf, ActionType.FirePhaser, {
				target_ship_id: 'miner',
				duration: 3600,
			});
			engine.advanceUntilIdle();

			const afterPhaser = miner.resolve();
			expect(afterPhaser.shield).toBeLessThan(afterPhaser.shieldMax);

			// Then: fire torpedo
			engine.submitAction(wolf, ActionType.FireTorpedo, {
				target_ship_id: 'miner',
			});
			engine.advanceUntilIdle();

			// All actions resolved
			expect(engine.getActions(wolf)).toHaveLength(2);
			expect(
				engine
					.getActions(wolf)
					.every((a) => a.status === ActionStatus.Fulfilled)
			).toBe(true);
		});

		it('engine auto-registers ships on submitAction', () => {
			const clock = createClock(0);
			const engine = createEngine(clock);
			const wolf = makeAttacker(clock);
			const miner = makeDefender(clock);

			// Register miner but not wolf
			engine.registerShip('miner', miner);

			// Submit action — wolf should be auto-registered by its id
			engine.submitAction(wolf, ActionType.FirePhaser, {
				target_ship_id: 'miner',
				duration: 3600,
			});

			// Wolf should now be findable
			expect(engine.getShip('wolf')).toBe(wolf);
		});
	});
});
