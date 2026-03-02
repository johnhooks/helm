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
	buildLoadout,
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
	pilot?: Record<string, number>;
}

interface ScenarioAction {
	ship: string;
	type: string;
	params?: Record<string, unknown>;
}

export interface ScenarioFile {
	name: string;
	description: string;
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
	};
}

function snapshotAllShips(ships: Record<string, Ship>): Record<string, StateSnapshot> {
	const result: Record<string, StateSnapshot> = {};
	for (const [name, ship] of Object.entries(ships)) {
		result[name] = snapshotState(ship.resolve());
	}
	return result;
}

export function runScenario(scenario: ScenarioFile): { timeline: TimelineEntry[]; actions: Action[] } {
	// Register handlers
	registerHandler(ActionType.Jump, jumpHandler);
	registerHandler(ActionType.ScanRoute, scanRouteHandler);

	const clock = createClock(0);
	const engine = createEngine(clock);
	const ships: Record<string, Ship> = {};

	// Build ships
	for (const [name, spec] of Object.entries(scenario.ships)) {
		const loadout = buildLoadout(spec.hull, {
			core: spec.core,
			drive: spec.drive,
			sensor: spec.sensor,
			shield: spec.shield,
			nav: spec.nav,
		});
		const rng = createRng(42);
		ships[name] = createShip(loadout, clock, rng, {
			nodeId: spec.node ?? 1,
			pilot: spec.pilot,
		});
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

		const action = engine.submitAction(
			ship,
			actionSpec.type as ActionType,
			actionSpec.params ?? {},
		);
		const resolved = engine.advanceUntilIdle();

		const finalAction = resolved[0] ?? action;
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
