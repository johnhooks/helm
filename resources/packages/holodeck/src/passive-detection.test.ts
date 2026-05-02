import { describe, it, expect, beforeEach } from 'vitest';
import { createShip } from './factory';
import { createClock } from './clock';
import { createRng } from './rng';
import { ActionType } from './enums/action-type';
import { scanRouteHandler } from './actions/scan-route';
import { registerHandler } from './actions/registry';
import { createEngine } from './actions/engine';
import { buildLoadout } from './loadout-builder';
import { makeLoadout } from './test-helpers';

beforeEach(() => {
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
});

describe('Passive Detection', () => {
	it('DSC detects with higher confidence than ACU (passive affinity)', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Emitter scanning — loud pnp_scan emission
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

		// DSC listener (passive: 1.4)
		const dscLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const dscShip = createShip(dscLoadout, clock, createRng(2), {
			id: 'dsc',
			nodeId: 1,
		});
		engine.registerShip('dsc', dscShip);

		// ACU listener (passive: 0.6)
		const acuLoadout = buildLoadout('striker', { sensor: 'acu_mk1' });
		const acuShip = createShip(acuLoadout, clock, createRng(3), {
			id: 'acu',
			nodeId: 1,
		});
		engine.registerShip('acu', acuShip);

		const dscResult = engine.queryPassiveDetection('dsc', 3600);
		const acuResult = engine.queryPassiveDetection('acu', 3600);

		expect(dscResult).not.toBeNull();
		expect(acuResult).not.toBeNull();

		// DSC has higher passive affinity → higher confidence
		expect(dscResult!.detections.length).toBeGreaterThan(0);
		expect(acuResult!.detections.length).toBeGreaterThan(0);
		const dscConf = dscResult!.detections[0].confidence;
		const acuConf = acuResult!.detections[0].confidence;
		expect(dscConf).toBeGreaterThan(acuConf);
	});

	it('longer integration increases confidence', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Emitter scanning
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

		// Listener
		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);

		const shortResult = engine.queryPassiveDetection('listener', 60);
		const longResult = engine.queryPassiveDetection('listener', 3600);

		expect(shortResult).not.toBeNull();
		expect(longResult).not.toBeNull();

		expect(shortResult!.detections.length).toBeGreaterThan(0);
		expect(longResult!.detections.length).toBeGreaterThan(0);
		expect(longResult!.detections[0].confidence).toBeGreaterThanOrEqual(
			shortResult!.detections[0].confidence
		);
	});

	it('ship does not detect its own emissions', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		const loadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const ship = createShip(loadout, clock, createRng(42), {
			id: 'self',
			nodeId: 1,
		});
		engine.registerShip('self', ship);

		engine.submitAction(ship, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});

		const result = engine.queryPassiveDetection('self', 3600);
		expect(result).not.toBeNull();

		// Own scan emission should NOT appear as a detection
		const ownDetection = result!.detections.find(
			(d) => d.label?.includes('self')
		);
		expect(ownDetection).toBeUndefined();
	});

	it('own emissions still contribute to noise floor (self-interference)', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Two ships: emitter + listener at same node
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

		// Listener also scanning — own emissions raise noise floor
		engine.submitAction(listener, ActionType.ScanRoute, {
			target_node_id: 43,
			distance: 3,
		});

		const result = engine.queryPassiveDetection('listener', 3600);
		expect(result).not.toBeNull();

		// Noise floor includes listener's own emissions
		const snapshot = result!.snapshot;
		expect(snapshot.noiseFloor).toBeGreaterThan(snapshot.stellarBaseline);
	});

	it('ECM raises noise floor, reduces detection confidence', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Emitter scanning
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

		// Listener
		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);

		// Get baseline detection without ECM
		const baseResult = engine.queryPassiveDetection('listener', 3600);

		// Now add ECM ship
		const ecmLoadout = buildLoadout('pioneer', {}, ['ecm_mk1']);
		const ecmShip = createShip(ecmLoadout, clock, createRng(3), {
			id: 'ecm',
			nodeId: 1,
		});
		engine.registerShip('ecm', ecmShip);
		ecmShip.activateEquipment('ecm_mk1');

		const ecmResult = engine.queryPassiveDetection('listener', 3600);

		expect(baseResult).not.toBeNull();
		expect(ecmResult).not.toBeNull();

		// ECM should raise noise floor
		expect(ecmResult!.snapshot.ecmNoise).toBeGreaterThan(0);
		expect(ecmResult!.snapshot.noiseFloor).toBeGreaterThan(
			baseResult!.snapshot.noiseFloor
		);

		// Detection confidence should decrease with ECM
		expect(baseResult!.detections.length).toBeGreaterThan(0);
		expect(ecmResult!.detections.length).toBeGreaterThan(0);
		expect(ecmResult!.detections[0].confidence).toBeLessThan(
			baseResult!.detections[0].confidence
		);
	});

	it('detection tier progression from confidence', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Create a loud emitter (scanning)
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

		// DSC listener (best passive sensor)
		const listenerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const listener = createShip(listenerLoadout, clock, createRng(2), {
			id: 'listener',
			nodeId: 1,
		});
		engine.registerShip('listener', listener);

		const result = engine.queryPassiveDetection('listener', 3600);
		expect(result).not.toBeNull();

		expect(result!.detections.length).toBeGreaterThan(0);
		const detection = result!.detections[0];
		// With enough confidence, we should get a non-null tier
		if (detection.confidence >= 0.15) {
			expect(detection.tier).not.toBeNull();
		}
		// Verify tier matches confidence thresholds
		if (detection.confidence >= 0.85) {
			expect(detection.tier).toBe('analysis');
		} else if (detection.confidence >= 0.65) {
			expect(detection.tier).toBe('type');
		} else if (detection.confidence >= 0.4) {
			expect(detection.tier).toBe('class');
		} else if (detection.confidence >= 0.15) {
			expect(detection.tier).toBe('anomaly');
		}
	});

	it('returns null for unknown ship', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		const result = engine.queryPassiveDetection('nonexistent', 3600);
		expect(result).toBeNull();
	});

	it('returns null for ship without sensor affinity', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// makeLoadout creates ships with test products that lack sensorDsp
		const loadout = makeLoadout();
		const ship = createShip(loadout, clock, createRng(42), {
			id: 'nosensor',
			nodeId: 1,
		});
		engine.registerShip('nosensor', ship);

		const result = engine.queryPassiveDetection('nosensor', 3600);
		expect(result).toBeNull();
	});

	it('multi-ship: wolf detects miner scanning, miner detects wolf scanning', () => {
		const clock = createClock();
		const engine = createEngine(clock);

		// Wolf with ACU (good pulse detection)
		const wolfLoadout = buildLoadout('striker', { sensor: 'acu_mk1' });
		const wolf = createShip(wolfLoadout, clock, createRng(1), {
			id: 'wolf',
			nodeId: 1,
		});
		engine.registerShip('wolf', wolf);

		// Miner with DSC (good continuous detection)
		const minerLoadout = buildLoadout('surveyor', { sensor: 'dsc_mk1' });
		const miner = createShip(minerLoadout, clock, createRng(2), {
			id: 'miner',
			nodeId: 1,
		});
		engine.registerShip('miner', miner);

		// Both scanning
		engine.submitAction(wolf, ActionType.ScanRoute, {
			target_node_id: 42,
			distance: 2,
		});
		engine.submitAction(miner, ActionType.ScanRoute, {
			target_node_id: 43,
			distance: 3,
		});

		const wolfResult = engine.queryPassiveDetection('wolf', 3600);
		const minerResult = engine.queryPassiveDetection('miner', 3600);

		expect(wolfResult).not.toBeNull();
		expect(minerResult).not.toBeNull();

		// Wolf should detect miner's scan (not its own)
		expect(wolfResult!.detections.length).toBeGreaterThan(0);
		expect(wolfResult!.detections[0].label).toContain('miner');

		// Miner should detect wolf's scan (not its own)
		expect(minerResult!.detections.length).toBeGreaterThan(0);
		expect(minerResult!.detections[0].label).toContain('wolf');
	});
});
