import { describe, it, expect, beforeEach } from 'vitest';
import { emissionPower, tunedEmission, envelopeAt } from '@helm/formulas';
import { createShip } from '../factory';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionType } from '../enums/action-type';
import { jumpHandler } from './jump';
import { scanRouteHandler } from './scan-route';
import { firePhaserHandler } from './fire-phaser';
import { fireTorpedoHandler } from './fire-torpedo';
import { registerHandler } from './registry';
import { createEngine } from './engine';
import { emissionPowerAtTime } from '../emissions';
import { makeLoadout } from '../test-helpers';
import { buildLoadout } from '../loadout-builder';

beforeEach(() => {
	registerHandler(ActionType.Jump, jumpHandler);
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
	registerHandler(ActionType.FirePhaser, firePhaserHandler);
	registerHandler(ActionType.FireTorpedo, fireTorpedoHandler);
});

function setup(config?: Parameters<typeof createShip>[3]) {
	const clock = createClock();
	const engine = createEngine(clock);
	const loadout = makeLoadout();
	const rng = createRng(42);
	const ship = createShip(loadout, clock, rng, { nodeId: 1, ...config });
	return { engine, ship, clock, loadout };
}

describe('Emission Tracking', () => {
	describe('jump emissions', () => {
		it('creates drive_spool emission at origin node on submit', () => {
			const { engine, ship } = setup();

			engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			const emissions = engine.getActiveEmissions(1);
			expect(emissions).toHaveLength(1);
			expect(emissions[0].emissionType).toBe('drive_spool');
			expect(emissions[0].shipId).toBe(ship.resolve().id);
			expect(emissions[0].nodeId).toBe(1);
			expect(emissions[0].endedAt).toBeNull();
		});

		it('spool emission ends when spool phase resolves', () => {
			const { engine, ship } = setup();

			const action = engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			const spoolEnd = action.deferredUntil!;
			engine.advance(spoolEnd);

			// Spool emission ended at origin
			const originEmissions = engine.getActiveEmissions(1, spoolEnd);
			const spoolEmission = originEmissions.find(
				(e) => e.emissionType === 'drive_spool'
			);
			expect(spoolEmission).toBeUndefined();

			// Cooldown emission active at destination
			const destEmissions = engine.getActiveEmissions(42, spoolEnd);
			expect(destEmissions).toHaveLength(1);
			expect(destEmissions[0].emissionType).toBe('drive_cooldown');
			expect(destEmissions[0].nodeId).toBe(42);
		});

		it('all emissions end when action fully resolves', () => {
			const { engine, ship } = setup();

			engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			engine.advanceUntilIdle();
			const now = engine.clock.now();

			// No active emissions anywhere
			expect(engine.getActiveEmissions(1, now)).toHaveLength(0);
			expect(engine.getActiveEmissions(42, now)).toHaveLength(0);

			// All emissions have endedAt set
			const allEmissions = engine.getAllEmissions();
			expect(allEmissions.length).toBeGreaterThan(0);
			for (const e of allEmissions) {
				expect(e.endedAt).not.toBeNull();
			}
		});
	});

	describe('scan emissions', () => {
		it('creates pnp_scan emission at ship node', () => {
			const { engine, ship } = setup();

			engine.submitAction(ship, ActionType.ScanRoute, {
				target_node_id: 42,
				distance: 2,
			});

			const emissions = engine.getActiveEmissions(1);
			expect(emissions).toHaveLength(1);
			expect(emissions[0].emissionType).toBe('pnp_scan');
			expect(emissions[0].nodeId).toBe(1);
		});

		it('emission power scales with effort', () => {
			const { engine, ship } = setup();

			engine.submitAction(ship, ActionType.ScanRoute, {
				target_node_id: 42,
				distance: 2,
				effort: 2.0,
			});

			const emissions = engine.getActiveEmissions(1);
			const expectedPower = tunedEmission(emissionPower('pnp_scan'), 2.0);
			expect(emissions[0].basePower).toBe(expectedPower);
		});

		it('emission ends when scan resolves', () => {
			const { engine, ship } = setup();

			engine.submitAction(ship, ActionType.ScanRoute, {
				target_node_id: 42,
				distance: 2,
			});

			engine.advanceUntilIdle();
			expect(engine.getActiveEmissions(1)).toHaveLength(0);
		});
	});

	describe('combat emissions', () => {
		function setupCombat() {
			const clock = createClock();
			const engine = createEngine(clock);
			const wolfLoadout = buildLoadout('striker', {}, ['phaser_array']);
			const wolf = createShip(wolfLoadout, clock, createRng(42), {
				id: 'wolf',
				nodeId: 1,
			});
			engine.registerShip('wolf', wolf);

			const preyLoadout = buildLoadout('pioneer');
			const prey = createShip(preyLoadout, clock, createRng(99), {
				id: 'prey',
				nodeId: 1,
			});
			engine.registerShip('prey', prey);

			return { engine, clock, wolf, prey };
		}

		it('phaser creates weapons_fire emission', () => {
			const { engine, wolf } = setupCombat();

			engine.submitAction(wolf, ActionType.FirePhaser, {
				target_ship_id: 'prey',
				duration: 3600,
			});

			const emissions = engine.getActiveEmissions(1);
			expect(emissions).toHaveLength(1);
			expect(emissions[0].emissionType).toBe('weapons_fire');
			expect(emissions[0].shipId).toBe('wolf');
		});

		it('torpedo creates weapons_fire emission', () => {
			const clock = createClock();
			const engine = createEngine(clock);
			const wolfLoadout = buildLoadout('specter', {}, [
				'torpedo_launcher',
			]);
			const wolf = createShip(wolfLoadout, clock, createRng(42), {
				id: 'wolf',
				nodeId: 1,
				ammo: { torpedo_launcher: 4 },
			});
			engine.registerShip('wolf', wolf);

			const preyLoadout = buildLoadout('pioneer');
			const prey = createShip(preyLoadout, clock, createRng(99), {
				id: 'prey',
				nodeId: 1,
			});
			engine.registerShip('prey', prey);

			engine.submitAction(wolf, ActionType.FireTorpedo, {
				target_ship_id: 'prey',
			});

			const emissions = engine.getActiveEmissions(1);
			expect(emissions).toHaveLength(1);
			expect(emissions[0].emissionType).toBe('weapons_fire');
		});
	});

	describe('multi-ship emissions', () => {
		it('emissions accumulate at shared node', () => {
			const clock = createClock();
			const engine = createEngine(clock);

			const loadout1 = makeLoadout();
			const ship1 = createShip(loadout1, clock, createRng(1), {
				id: 'ship1',
				nodeId: 1,
			});
			engine.registerShip('ship1', ship1);

			const loadout2 = makeLoadout();
			const ship2 = createShip(loadout2, clock, createRng(2), {
				id: 'ship2',
				nodeId: 1,
			});
			engine.registerShip('ship2', ship2);

			engine.submitAction(ship1, ActionType.ScanRoute, {
				target_node_id: 42,
				distance: 2,
			});
			engine.submitAction(ship2, ActionType.ScanRoute, {
				target_node_id: 43,
				distance: 3,
			});

			const emissions = engine.getActiveEmissions(1);
			expect(emissions).toHaveLength(2);
			expect(emissions[0].shipId).not.toBe(emissions[1].shipId);
		});
	});

	describe('no emissions', () => {
		it('returns empty when no actions in progress', () => {
			const { engine } = setup();
			expect(engine.getActiveEmissions(1)).toHaveLength(0);
		});

		it('returns empty at non-matching node', () => {
			const { engine, ship } = setup();

			engine.submitAction(ship, ActionType.ScanRoute, {
				target_node_id: 42,
				distance: 2,
			});

			expect(engine.getActiveEmissions(99)).toHaveLength(0);
		});
	});

	describe('emission record metadata', () => {
		it('records have correct ids and references', () => {
			const { engine, ship } = setup();

			const action = engine.submitAction(ship, ActionType.ScanRoute, {
				target_node_id: 42,
				distance: 2,
			});

			const emissions = engine.getActiveEmissions(1);
			expect(emissions[0].id).toBeGreaterThan(0);
			expect(emissions[0].actionId).toBe(action.id);
			expect(emissions[0].shipId).toBe(ship.resolve().id);
			expect(emissions[0].startedAt).toBe(0);
		});
	});

	describe('drive envelope emissions', () => {
		function setupWithCatalogDrive(driveSlug = 'dr_305') {
			const clock = createClock();
			const engine = createEngine(clock);
			const loadout = buildLoadout('pioneer', { drive: driveSlug });
			const ship = createShip(loadout, clock, createRng(42), {
				id: 'jumper',
				nodeId: 1,
			});
			engine.registerShip('jumper', ship);
			return { engine, ship, clock, loadout };
		}

		it('spool emission has envelope from drive catalog', () => {
			const { engine, ship } = setupWithCatalogDrive('dr_305');

			engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			const emissions = engine.getActiveEmissions(1);
			expect(emissions).toHaveLength(1);
			expect(emissions[0].envelope).toBeDefined();
			expect(emissions[0].envelope!.label).toBe('DR-305 Economy');
			// Spool-only envelope: spool has data, sustain/cooldown zeroed
			expect(emissions[0].envelope!.spool.duration).toBe(180);
			expect(emissions[0].envelope!.spool.peakPower).toBe(1.2);
			expect(emissions[0].envelope!.sustain.duration).toBe(0);
			expect(emissions[0].envelope!.cooldown.duration).toBe(0);
		});

		it('cooldown emission has cooldown-only envelope at destination', () => {
			const { engine, ship, clock } = setupWithCatalogDrive('dr_305');

			const action = engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			// Advance to spool end
			clock.advanceTo(action.deferredUntil!);
			engine.advance(0); // resolve spool → starts cooldown

			const destEmissions = engine.getActiveEmissions(42);
			expect(destEmissions).toHaveLength(1);
			expect(destEmissions[0].emissionType).toBe('drive_cooldown');
			expect(destEmissions[0].envelope).toBeDefined();
			// Cooldown-only: spool/sustain zeroed, cooldown has data
			expect(destEmissions[0].envelope!.spool.duration).toBe(0);
			expect(destEmissions[0].envelope!.sustain.duration).toBe(0);
			expect(destEmissions[0].envelope!.cooldown.duration).toBe(120);
			expect(destEmissions[0].envelope!.cooldown.peakPower).toBe(0.8);
		});

		it('cooldown duration derived from drive envelope', () => {
			const { engine, ship } = setupWithCatalogDrive('dr_305');

			const action = engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			// DR-305 cooldown.duration = 120
			expect(action.result.cooldown_duration).toBe(120);
		});

		it('DR-705 has different envelope than DR-305', () => {
			const setup305 = setupWithCatalogDrive('dr_305');
			setup305.engine.submitAction(setup305.ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});
			const emissions305 = setup305.engine.getActiveEmissions(1);

			const setup705 = setupWithCatalogDrive('dr_705');
			setup705.engine.submitAction(setup705.ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});
			const emissions705 = setup705.engine.getActiveEmissions(1);

			// DR-705 spool peakPower (2.5) > DR-305 spool peakPower (1.2)
			expect(emissions705[0].envelope!.spool.peakPower).toBeGreaterThan(
				emissions305[0].envelope!.spool.peakPower
			);
		});

		it('envelope power varies over time via emissionPowerAtTime', () => {
			const { engine, ship } = setupWithCatalogDrive('dr_305');

			engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			const emission = engine.getActiveEmissions(1)[0];
			const basePower = emission.basePower;
			const envelope = emission.envelope!;

			// Power at start of spool
			const earlyPower = emissionPowerAtTime(
				emission,
				emission.startedAt + 1
			);
			// Power at mid-spool
			const midPower = emissionPowerAtTime(
				emission,
				emission.startedAt + 90
			);

			// Both should be > 0 (spool is active)
			expect(earlyPower).toBeGreaterThan(0);
			expect(midPower).toBeGreaterThan(0);

			// Verify it matches direct envelopeAt calculation
			const earlyState = envelopeAt(1, envelope);
			expect(earlyPower).toBe(basePower * earlyState.power);
		});

		it('emissionPowerAtTime returns 0 for idle envelope phase', () => {
			const { engine, ship } = setupWithCatalogDrive('dr_305');

			engine.submitAction(ship, ActionType.Jump, {
				target_node_id: 42,
				distance: 2,
			});

			const emission = engine.getActiveEmissions(1)[0];

			// Way past the spool-only envelope duration — should be idle
			const latePower = emissionPowerAtTime(
				emission,
				emission.startedAt + 10000
			);
			expect(latePower).toBe(0);
		});

		it('emissionPowerAtTime returns basePower when no envelope', () => {
			const { engine, ship } = setup();

			engine.submitAction(ship, ActionType.ScanRoute, {
				target_node_id: 42,
				distance: 2,
			});

			const emission = engine.getActiveEmissions(1)[0];
			expect(emission.envelope).toBeUndefined();
			expect(emissionPowerAtTime(emission, 50)).toBe(emission.basePower);
		});
	});
});
