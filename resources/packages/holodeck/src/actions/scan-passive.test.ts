import { describe, it, expect, beforeEach } from 'vitest';
import { createShip } from '../factory';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionType } from '../enums/action-type';
import { ActionStatus } from '../enums/action-status';
import { registerHandler } from './registry';
import { scanRouteHandler } from './scan-route';
import { jumpHandler } from './jump';
import { createEngine } from './engine';
import { buildLoadout } from '../loadout-builder';

beforeEach(() => {
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
	registerHandler(ActionType.Jump, jumpHandler);
});

describe('Engine — Passive Scans', () => {
	it('processPassiveScans creates scan_passive action when clock >= nextPassiveScanAt', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Emitter scanning (creates emission)
		const emitterLoadout = buildLoadout('pioneer');
		const emitter = createShip(emitterLoadout, clock, createRng(1), {
			id: 'emitter',
			nodeId: 1,
		});
		engine.registerShip('emitter', emitter);
		engine.submitAction(emitter, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});

		// DSC listener (default interval 300s)
		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);

		// Advance to 300s (default passiveScanInterval)
		clock.advance(300);

		const actions = engine.processPassiveScans();
		// Listener should have a scan_passive action (emitter is at same node, scanning)
		const listenerActions = actions.filter((a) => a.shipId === 'listener');
		expect(listenerActions).toHaveLength(1);
		expect(listenerActions[0].type).toBe(ActionType.ScanPassive);
		expect(listenerActions[0].status).toBe(ActionStatus.Fulfilled);
	});

	it('action has correct result shape', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		const emitterLoadout = buildLoadout('pioneer');
		const emitter = createShip(emitterLoadout, clock, createRng(1), {
			id: 'emitter',
			nodeId: 1,
		});
		engine.registerShip('emitter', emitter);
		engine.submitAction(emitter, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});

		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);

		clock.advance(300);
		const actions = engine.processPassiveScans();
		const action = actions.find((a) => a.shipId === 'listener')!;

		expect(action.deferredUntil).toBeNull();
		expect(action.result.detections).toBeDefined();
		expect(action.result.noise_floor).toBeDefined();
		expect(action.result.stellar_baseline).toBeDefined();
		expect(action.result.ecm_noise).toBeDefined();
		expect(action.result.source_count).toBeDefined();
		expect(action.result.integration_seconds).toBe(300);
	});

	it('no action created when node is quiet', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Listener alone at node — no emissions
		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(1), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);

		clock.advance(300);
		const actions = engine.processPassiveScans();
		expect(actions).toHaveLength(0);
	});

	it('scan_passive does not block action slot', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Emitter scanning (creates loud pnp_scan emission)
		const emitterLoadout = buildLoadout('pioneer');
		const emitter = createShip(emitterLoadout, clock, createRng(1), {
			id: 'emitter',
			nodeId: 1,
		});
		engine.registerShip('emitter', emitter);
		engine.submitAction(emitter, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});

		// Listener has a pending jump (action slot occupied, minimal noise contribution)
		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);
		engine.submitAction(listener, ActionType.Jump, {
			target_node_id: 42,
			distance: 1,
		});

		// Listener has a pending action
		expect(engine.getCurrentAction(listener)).not.toBeNull();

		// Passive scan should still fire despite occupied action slot
		clock.advance(300);
		const actions = engine.processPassiveScans();
		const listenerScans = actions.filter((a) => a.shipId === 'listener');
		expect(listenerScans).toHaveLength(1);
		expect(listenerScans[0].type).toBe(ActionType.ScanPassive);
	});

	it('handles multiple ships at different intervals', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Emitter scanning (creates loud pnp_scan emission)
		const emitterLoadout = buildLoadout('pioneer');
		const emitter = createShip(emitterLoadout, clock, createRng(1), {
			id: 'emitter',
			nodeId: 1,
		});
		engine.registerShip('emitter', emitter);
		engine.submitAction(emitter, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});

		// Listener A: default interval (300s)
		const loadoutA = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const shipA = createShip(loadoutA, clock, createRng(2), {
			id: 'listener-a',
			nodeId: 1,
		});
		engine.registerShip('listener-a', shipA);

		// Listener B: custom interval (600s)
		const loadoutB = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const shipB = createShip(loadoutB, clock, createRng(3), {
			id: 'listener-b',
			nodeId: 1,
			passiveScanInterval: 600,
		});
		engine.registerShip('listener-b', shipB);

		// At 300s: only listener-a should fire
		clock.advance(300);
		const first = engine.processPassiveScans();
		const firstIds = first.map((a) => a.shipId);
		expect(firstIds).toContain('listener-a');
		expect(firstIds).not.toContain('listener-b');

		// At 600s: listener-a fires again, listener-b fires for first time
		clock.advance(300);
		const second = engine.processPassiveScans();
		const secondIds = second.map((a) => a.shipId);
		expect(secondIds).toContain('listener-a');
		expect(secondIds).toContain('listener-b');
	});

	it('nextPassiveScanAt advances by interval after scan', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		const emitterLoadout = buildLoadout('pioneer');
		const emitter = createShip(emitterLoadout, clock, createRng(1), {
			id: 'emitter',
			nodeId: 1,
		});
		engine.registerShip('emitter', emitter);
		emitter.absorbDamage(10);

		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);

		expect(listener.getNextPassiveScanAt()).toBe(300);

		clock.advance(300);
		engine.processPassiveScans();

		// After scan at t=300, next should be at t=600
		expect(listener.getNextPassiveScanAt()).toBe(600);
	});

	it('passiveScanInterval defaults to 300', () => {
		const clock = createClock();
		const loadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const ship = createShip(loadout, clock, createRng(1), {
			id: 'ship',
			nodeId: 1,
		});

		const state = ship.resolve();
		expect(state.passiveScanInterval).toBe(300);
		expect(state.nextPassiveScanAt).toBe(300);
	});

	it('processPassiveScan (single-ship) works regardless of timing', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		const emitterLoadout = buildLoadout('pioneer');
		const emitter = createShip(emitterLoadout, clock, createRng(1), {
			id: 'emitter',
			nodeId: 1,
		});
		engine.registerShip('emitter', emitter);
		engine.submitAction(emitter, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});

		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);

		// At t=0, nextPassiveScanAt=300. processPassiveScan ignores timing.
		const action = engine.processPassiveScan('listener');
		expect(action).not.toBeNull();
		expect(action!.type).toBe(ActionType.ScanPassive);
		expect(action!.status).toBe(ActionStatus.Fulfilled);
	});

	it('Ship.resolve() includes passiveScanInterval and nextPassiveScanAt', () => {
		const clock = createClock();
		const loadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const ship = createShip(loadout, clock, createRng(1), {
			id: 'ship',
			nodeId: 1,
			passiveScanInterval: 120,
		});

		const state = ship.resolve();
		expect(state.passiveScanInterval).toBe(120);
		expect(state.nextPassiveScanAt).toBe(120);
	});

	it('advance() triggers passive scans automatically', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Emitter scanning (loud pnp_scan emission)
		const emitterLoadout = buildLoadout('pioneer');
		const emitter = createShip(emitterLoadout, clock, createRng(1), {
			id: 'emitter',
			nodeId: 1,
		});
		engine.registerShip('emitter', emitter);
		const scanAction = engine.submitAction(emitter, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});

		// Listener with short interval so it fires before scan resolves
		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
			passiveScanInterval: 30,
		});
		engine.registerShip('listener', listener);

		// Guard: scan must not resolve before passive scan fires
		expect(scanAction.deferredUntil).toBeGreaterThan(30);

		// advance past the listener's scan interval (scan still active)
		const resolved = engine.advance(30);
		const passiveActions = resolved.filter(
			(a) => a.type === ActionType.ScanPassive
		);
		expect(passiveActions).toHaveLength(1);
		expect(passiveActions[0].shipId).toBe('listener');
	});
});
