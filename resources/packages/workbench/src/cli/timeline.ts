/**
 * Timeline command — run a sequence of direct Ship mutations with clock advances.
 *
 * bun run wb timeline --steps='[{"t":0,"action":"consumePower","amount":50}]'
 * bun run wb timeline --file=timeline.json
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createShip, createClock, createRng } from '@helm/holodeck';
import type { ShipState } from '@helm/holodeck';
import type { PilotSkills } from '@helm/formulas';
import type { ParsedFlags } from './parse';
import { hydrateLoadout, loadoutSlugs, resolvePilot } from './parse';
import { r } from '../format';

interface TimelineStep {
	t: number;
	action: string;
	amount?: number;
	nodeId?: number;
	priority?: number;
	slug?: string;
	quantity?: number;
	count?: number;
}

interface TimelineFile {
	ship?: {
		hull?: string;
		core?: string;
		drive?: string;
		sensor?: string;
		shield?: string;
		nav?: string;
		shieldPriority?: number;
		pilot?: Partial<PilotSkills>;
	};
	steps: TimelineStep[];
}

interface Snapshot {
	t: number;
	action: string;
	params?: Record<string, unknown>;
	result?: Record<string, unknown>;
	state: {
		power: number;
		powerMax: number;
		shield: number;
		shieldMax: number;
		hull: number;
		hullMax: number;
		coreLife: number;
	};
}

function resolveState(state: ShipState) {
	return {
		power: r(state.power),
		powerMax: r(state.powerMax),
		shield: r(state.shield),
		shieldMax: r(state.shieldMax),
		hull: r(state.hull),
		hullMax: r(state.hullMax),
		coreLife: r(state.coreLife),
	};
}

export function timeline({ flags }: ParsedFlags): void {
	let steps: TimelineStep[];
	const shipFlags: Record<string, string> = {};
	let shieldPriority: number | undefined;
	let filePilot: Partial<PilotSkills> | undefined;

	if (flags.file) {
		const fullPath = resolve(process.cwd(), flags.file);
		const raw = readFileSync(fullPath, 'utf-8');
		const data: TimelineFile = JSON.parse(raw);
		steps = data.steps;
		if (data.ship) {
			if (data.ship.pilot) {
				filePilot = data.ship.pilot;
			}
			for (const [key, value] of Object.entries(data.ship)) {
				if (key === 'shieldPriority' && typeof value === 'number') {
					shieldPriority = value;
				} else if (key === 'pilot') {
					// handled above
				} else if (value && typeof value === 'string') {
					shipFlags[key] = value;
				}
			}
		}
	} else if (flags.steps) {
		steps = JSON.parse(flags.steps);
	} else {
		console.error('Usage: bun run wb timeline --steps=\'[...]\' or --file=timeline.json'); // eslint-disable-line no-console
		process.exit(1);
	}

	// Merge file ship config with CLI flags (CLI flags win)
	const mergedFlags = { ...shipFlags, ...flags };

	const loadout = hydrateLoadout(mergedFlags);

	// File pilot overrides defaults, CLI --pilot.* flags override file
	const pilot = resolvePilot({ ...shipFlags, ...flags });
	if (filePilot) {
		// Apply file pilot first (as defaults), then CLI flags win
		for (const [key, value] of Object.entries(filePilot)) {
			const k = key as keyof PilotSkills;
			if (!((`pilot.${k}`) in flags)) {
				pilot[k] = value;
			}
		}
	}

	const clock = createClock(0);
	const rng = createRng(42);
	const ship = createShip(loadout, clock, rng, { shieldPriority, pilot });

	// Sort steps by time
	const sorted = [...steps].sort((a, b) => a.t - b.t);

	const snapshots: Snapshot[] = [];

	for (const step of sorted) {
		// Advance clock to step time
		clock.advance(step.t - clock.now());

		let result: Record<string, unknown> | undefined;
		let params: Record<string, unknown> | undefined;

		switch (step.action) {
			case 'resolve':
				// Just snapshot, no mutation
				break;

			case 'consumePower':
				params = { amount: step.amount };
				ship.consumePower(step.amount ?? 0);
				break;

			case 'absorbDamage': {
				params = { amount: step.amount };
				const dmg = ship.absorbDamage(step.amount ?? 0);
				result = { shieldAbsorbed: r(dmg.shieldAbsorbed), hullDamage: r(dmg.hullDamage) };
				break;
			}

			case 'degradeCore':
				params = { amount: step.amount };
				ship.degradeCore(step.amount ?? 0);
				break;

			case 'repairHull':
				params = { amount: step.amount };
				ship.repairHull(step.amount ?? 0);
				break;

			case 'moveToNode':
				params = { nodeId: step.nodeId };
				ship.moveToNode(step.nodeId ?? 0);
				break;

			case 'setShieldPriority':
				params = { priority: step.priority };
				ship.setShieldPriority(step.priority ?? 1.0);
				break;

			case 'addCargo':
				params = { slug: step.slug, quantity: step.quantity };
				ship.addCargo(step.slug ?? '', step.quantity ?? 0);
				break;

			case 'removeCargo':
				params = { slug: step.slug, quantity: step.quantity };
				ship.removeCargo(step.slug ?? '', step.quantity ?? 0);
				break;

			case 'consumeAmmo':
				params = { slug: step.slug, count: step.count };
				ship.consumeAmmo(step.slug ?? '', step.count ?? 1);
				break;

			default:
				console.error(`Unknown action: ${step.action}`); // eslint-disable-line no-console
				process.exit(1);
		}

		const state = ship.resolve();
		const snapshot: Snapshot = {
			t: step.t,
			action: step.action,
			state: resolveState(state),
		};
		if (params) {snapshot.params = params;}
		if (result) {snapshot.result = result;}

		snapshots.push(snapshot);
	}

	const output = {
		ship: loadoutSlugs(loadout),
		snapshots,
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}
