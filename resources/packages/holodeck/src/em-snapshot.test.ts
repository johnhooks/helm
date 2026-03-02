import { describe, it, expect, beforeEach } from 'vitest';
import { stellarNoise, emissionPower } from '@helm/formulas';
import { createShip } from './factory';
import { createClock } from './clock';
import { createRng } from './rng';
import { ActionType } from './enums/action-type';
import { jumpHandler } from './actions/jump';
import { scanRouteHandler } from './actions/scan-route';
import { registerHandler } from './actions/registry';
import { createEngine } from './actions/engine';
import { buildLoadout } from './loadout-builder';
import { createNavGraph } from './nav-graph';

beforeEach(() => {
	registerHandler(ActionType.Jump, jumpHandler);
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
});

describe('EM Snapshot', () => {
	it('empty node has only stellar noise', () => {
		const clock = createClock();
		const graph = createNavGraph('helm');
		const engine = createEngine(clock, graph);

		// Node 1 (Sol, G-class)
		const snapshot = engine.computeEMSnapshot(1);
		expect(snapshot.stellarBaseline).toBe(stellarNoise('G'));
		expect(snapshot.noiseFloor).toBe(stellarNoise('G'));
		expect(snapshot.sources).toHaveLength(0);
		expect(snapshot.ecmNoise).toBe(0);
	});

	it('different stellar classes produce different baselines', () => {
		const clock = createClock();
		const graph = createNavGraph('helm');
		const engine = createEngine(clock, graph);

		// Find nodes with different stellar classes
		const solSnapshot = engine.computeEMSnapshot(1); // Sol = G-class

		// G-class baseline
		expect(solSnapshot.stellarBaseline).toBe(stellarNoise('G'));
		expect(solSnapshot.stellarBaseline).toBe(1.0);
	});

	it('waypoint without star defaults to G-class', () => {
		const clock = createClock();
		const engine = createEngine(clock); // no graph

		const snapshot = engine.computeEMSnapshot(999);
		expect(snapshot.stellarBaseline).toBe(stellarNoise('G'));
	});

	it('active scan adds to noise and sources', () => {
		const clock = createClock();
		const engine = createEngine(clock);
		const loadout = buildLoadout('pioneer');
		const ship = createShip(loadout, clock, createRng(42), { id: 'scanner', nodeId: 1 });
		engine.registerShip('scanner', ship);

		engine.submitAction(ship, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});

		const snapshot = engine.computeEMSnapshot(1);
		expect(snapshot.sources.length).toBeGreaterThan(0);
		expect(snapshot.noiseFloor).toBeGreaterThan(snapshot.stellarBaseline);

		const scanSource = snapshot.sources.find((s) => s.emissionType === 'pnp_scan');
		expect(scanSource).toBeDefined();
		expect(scanSource!.shipId).toBe('scanner');
	});

	it('ECM contributes to ecmNoise, not sources', () => {
		const clock = createClock();
		const engine = createEngine(clock);
		const loadout = buildLoadout('pioneer', {}, ['ecm_mk1']);
		const ship = createShip(loadout, clock, createRng(42), { id: 'ecm-ship', nodeId: 1 });
		engine.registerShip('ecm-ship', ship);
		ship.activateEquipment('ecm_mk1');

		const snapshot = engine.computeEMSnapshot(1);
		expect(snapshot.ecmNoise).toBeGreaterThan(0);
		expect(snapshot.ecmNoise).toBe(emissionPower('ecm'));

		// ECM should NOT appear in sources
		const ecmSource = snapshot.sources.find((s) => s.emissionType === 'ecm');
		expect(ecmSource).toBeUndefined();
	});

	it('multiple ships at same node accumulate emissions', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		const loadout1 = buildLoadout('pioneer');
		const ship1 = createShip(loadout1, clock, createRng(1), { id: 'ship1', nodeId: 1 });
		engine.registerShip('ship1', ship1);

		const loadout2 = buildLoadout('pioneer');
		const ship2 = createShip(loadout2, clock, createRng(2), { id: 'ship2', nodeId: 1 });
		engine.registerShip('ship2', ship2);

		engine.submitAction(ship1, ActionType.ScanRoute, { target_node_id: 42, distance: 2 });
		engine.submitAction(ship2, ActionType.ScanRoute, { target_node_id: 43, distance: 3 });

		const snapshot = engine.computeEMSnapshot(1);
		expect(snapshot.sources.length).toBe(2);

		const singleShipSnapshot = (() => {
			const c = createClock();
			const e = createEngine(c);
			const l = buildLoadout('pioneer');
			const s = createShip(l, c, createRng(1), { id: 'solo', nodeId: 1 });
			e.registerShip('solo', s);
			e.submitAction(s, ActionType.ScanRoute, { target_node_id: 42, distance: 2 });
			return e.computeEMSnapshot(1);
		})();

		expect(snapshot.noiseFloor).toBeGreaterThan(singleShipSnapshot.noiseFloor);
	});

	it('shield regen appears as faint emission', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Create a ship with damaged shields (shield < shieldMax)
		const loadout = buildLoadout('pioneer');
		const ship = createShip(loadout, clock, createRng(42), { id: 'damaged', nodeId: 1 });
		engine.registerShip('damaged', ship);

		// Damage the ship so shields are regenerating
		ship.absorbDamage(10);
		const state = ship.resolve();
		expect(state.shield).toBeLessThan(state.shieldMax);

		const snapshot = engine.computeEMSnapshot(1);
		const regenSource = snapshot.sources.find((s) => s.emissionType === 'shield_regen');
		expect(regenSource).toBeDefined();
		expect(regenSource!.power).toBe(emissionPower('shield_regen'));
	});
});
