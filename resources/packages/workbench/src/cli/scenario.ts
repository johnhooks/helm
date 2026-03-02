/**
 * Scenario command — run a sequence of actions from a JSON file through the
 * holodeck Engine. Actions are sequential — each one is submitted immediately
 * after the previous one resolves.
 *
 * bun run wb scenario data/scenarios/jump-chain.json
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
	createShip,
	createClock,
	createRng,
	createEngine,
	registerHandler,
	ActionType,
	jumpHandler,
	scanRouteHandler,
	firePhaserHandler,
	fireTorpedoHandler,
	buildLoadout,
	createNavGraph,
} from '@helm/holodeck';
import type { Ship, ShipState, Action } from '@helm/holodeck';
import type { ParsedFlags } from './parse';
import { r } from '../format';

interface ScenarioShipSpec {
	hull: string;
	core: string;
	drive: string;
	sensor: string;
	shield: string;
	nav: string;
	node?: number;
	equipment?: string[];
	ammo?: Record<string, number>;
	pilot?: Record<string, number>;
	passive_scan_interval?: number;
}

interface ScenarioAction {
	ship: string;
	type: string;
	params?: Record<string, unknown>;
}

export interface ScenarioFile {
	name: string;
	description: string;
	masterSeed?: string;
	ships: Record<string, ScenarioShipSpec>;
	actions: ScenarioAction[];
}

interface StateSnapshot {
	power: number;
	powerMax: number;
	shield: number;
	shieldMax: number;
	hull: number;
	hullMax: number;
	coreLife: number;
	nodeId: number | null;
	ammo: Record<string, number>;
	activeEquipment: string[];
}

interface TimelineEntry {
	t: number;
	action: { ship: string; type: string; params?: Record<string, unknown> } | null;
	result: Record<string, unknown> | null;
	ships: Record<string, StateSnapshot>;
}

function snapshotState(state: ShipState): StateSnapshot {
	return {
		power: r(state.power),
		powerMax: r(state.powerMax),
		shield: r(state.shield),
		shieldMax: r(state.shieldMax),
		hull: r(state.hull),
		hullMax: r(state.hullMax),
		coreLife: r(state.coreLife),
		nodeId: state.nodeId,
		ammo: { ...state.ammo },
		activeEquipment: [...state.activeEquipment],
	};
}

function snapshotAllShips(ships: Record<string, Ship>): Record<string, StateSnapshot> {
	const result: Record<string, StateSnapshot> = {};
	for (const [name, ship] of Object.entries(ships)) {
		result[name] = snapshotState(ship.resolve());
	}
	return result;
}

function registerAllHandlers(): void {
	registerHandler(ActionType.Jump, jumpHandler);
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
	registerHandler(ActionType.FirePhaser, firePhaserHandler);
	registerHandler(ActionType.FireTorpedo, fireTorpedoHandler);
}

export function runScenario(scenario: ScenarioFile): { timeline: TimelineEntry[]; actions: Action[] } {
	registerAllHandlers();

	const clock = createClock(0);
	const graph = createNavGraph(scenario.masterSeed ?? 'helm');
	const engine = createEngine(clock, graph);
	const ships: Record<string, Ship> = {};

	// Build ships
	for (const [name, spec] of Object.entries(scenario.ships)) {
		const loadout = buildLoadout(
			spec.hull,
			{
				core: spec.core,
				drive: spec.drive,
				sensor: spec.sensor,
				shield: spec.shield,
				nav: spec.nav,
			},
			spec.equipment,
		);

		// Compute default ammo from equipment capacity
		const defaultAmmo: Record<string, number> = {};
		for (const eq of loadout.equipment) {
			if (eq.product.type === 'weapon' && eq.product.capacity) {
				defaultAmmo[eq.product.slug] = eq.product.capacity;
			}
		}

		const rng = createRng(42);
		ships[name] = createShip(loadout, clock, rng, {
			id: name,
			nodeId: spec.node ?? 1,
			ammo: spec.ammo ?? defaultAmmo,
			pilot: spec.pilot,
			passiveScanInterval: spec.passive_scan_interval,
		});

		// Register ship with engine by scenario name
		engine.registerShip(name, ships[name]);
	}

	const timeline: TimelineEntry[] = [];
	const resolvedActions: Action[] = [];

	// Initial snapshot at t=0
	timeline.push({
		t: clock.now(),
		action: null,
		result: null,
		ships: snapshotAllShips(ships),
	});

	// Run actions sequentially
	for (const actionSpec of scenario.actions) {
		const ship = ships[actionSpec.ship];
		if (!ship) {
			throw new Error(`Unknown ship: ${actionSpec.ship}`);
		}

		// Handle equipment mutations directly (not engine actions)
		if (actionSpec.type === 'activate_equipment') {
			const slug = (actionSpec.params?.equipment_slug as string) ?? '';
			ship.activateEquipment(slug);
			timeline.push({
				t: clock.now(),
				action: { ship: actionSpec.ship, type: actionSpec.type, params: actionSpec.params },
				result: { activated: slug },
				ships: snapshotAllShips(ships),
			});
			continue;
		}

		if (actionSpec.type === 'deactivate_equipment') {
			const slug = (actionSpec.params?.equipment_slug as string) ?? '';
			ship.deactivateEquipment(slug);
			timeline.push({
				t: clock.now(),
				action: { ship: actionSpec.ship, type: actionSpec.type, params: actionSpec.params },
				result: { deactivated: slug },
				ships: snapshotAllShips(ships),
			});
			continue;
		}

		if (actionSpec.type === 'absorb_damage') {
			const amount = (actionSpec.params?.amount as number) ?? 0;
			const dmg = ship.absorbDamage(amount);
			timeline.push({
				t: clock.now(),
				action: { ship: actionSpec.ship, type: actionSpec.type, params: actionSpec.params },
				result: { shieldAbsorbed: dmg.shieldAbsorbed, hullDamage: dmg.hullDamage },
				ships: snapshotAllShips(ships),
			});
			continue;
		}

		if (actionSpec.type === 'scan_passive') {
			// Advance clock to ship's nextPassiveScanAt if needed
			// Use clock.advance directly to avoid triggering engine.processPassiveScans
			const scanShip = ships[actionSpec.ship];
			const nextScanAt = scanShip.getNextPassiveScanAt();
			if (nextScanAt > clock.now()) {
				clock.advance(nextScanAt - clock.now());
			}

			const action = engine.processPassiveScan(actionSpec.ship);
			const detectionResult: Record<string, unknown> = action
				? { ...action.result }
				: { detections: [], noise_floor: 0, source_count: 0, integration_seconds: 0 };
			timeline.push({
				t: clock.now(),
				action: { ship: actionSpec.ship, type: actionSpec.type, params: actionSpec.params },
				result: detectionResult,
				ships: snapshotAllShips(ships),
			});
			continue;
		}

		const action = engine.submitAction(
			ship,
			actionSpec.type as ActionType,
			actionSpec.params ?? {},
		);
		const allResolved = engine.advanceUntilIdle();

		// Passive scans that fired during this action's resolution
		for (const resolved of allResolved) {
			if (resolved.type === ActionType.ScanPassive) {
				timeline.push({
					t: resolved.createdAt,
					action: { ship: resolved.shipId, type: 'scan_passive' },
					result: { ...resolved.result },
					ships: snapshotAllShips(ships),
				});
			}
		}

		const finalAction = allResolved.find((a) => a.type !== ActionType.ScanPassive) ?? action;
		resolvedActions.push(finalAction);

		timeline.push({
			t: clock.now(),
			action: { ship: actionSpec.ship, type: actionSpec.type, params: actionSpec.params },
			result: { ...finalAction.result },
			ships: snapshotAllShips(ships),
		});
	}

	return { timeline, actions: resolvedActions };
}

export function scenarioCommand({ positional }: ParsedFlags): void {
	const scenarioPath = positional[1];
	if (!scenarioPath) {
		console.error('Usage: bun run wb scenario <scenario.json>'); // eslint-disable-line no-console
		process.exit(1);
	}

	const fullPath = resolve(process.cwd(), scenarioPath);
	const raw = readFileSync(fullPath, 'utf-8');
	const scenario: ScenarioFile = JSON.parse(raw);

	const { timeline } = runScenario(scenario);

	const output = {
		scenario: scenario.name,
		description: scenario.description,
		shipCount: Object.keys(scenario.ships).length,
		actionCount: scenario.actions.length,
		snapshotCount: timeline.length,
		timeline,
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}
