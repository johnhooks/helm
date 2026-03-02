/**
 * Action command — submit a single action to a holodeck Ship via the Engine.
 *
 * bun run wb action --action=jump --distance=5 --target-node=42
 * bun run wb action --action=scan_route --distance=3 --target-node=10 --hull=specter
 */

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
} from '@helm/holodeck';
import type { ParsedFlags } from './parse';
import { hydrateLoadout, loadoutSlugs, resolvePilot } from './parse';
import { r } from '../format';

function resolveState(state: { power: number; powerMax: number; shield: number; shieldMax: number; hull: number; hullMax: number; coreLife: number; nodeId: number | null }) {
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

export function action({ flags }: ParsedFlags): void {
	const actionType = flags.action as string | undefined;
	if (!actionType) {
		console.error('Usage: bun run wb action --action=jump|scan_route [--distance=N] [--target-node=N]'); // eslint-disable-line no-console
		console.error(''); // eslint-disable-line no-console
		console.error('Flags:'); // eslint-disable-line no-console
		console.error('  --action=jump|scan_route   Action type (required)'); // eslint-disable-line no-console
		console.error('  --distance=N               Distance (default 1)'); // eslint-disable-line no-console
		console.error('  --target-node=N            Target node ID (default 2)'); // eslint-disable-line no-console
		console.error('  --node=N                   Ship starting position (default 1)'); // eslint-disable-line no-console
		console.error('  --throttle=N               Jump throttle tuning'); // eslint-disable-line no-console
		console.error('  --effort=N                 Scan effort tuning'); // eslint-disable-line no-console
		console.error('  + all loadout/pilot flags from ship command'); // eslint-disable-line no-console
		process.exit(1);
	}

	// Register handlers
	registerHandler(ActionType.Jump, jumpHandler);
	registerHandler(ActionType.ScanRoute, scanRouteHandler);
	registerHandler(ActionType.FirePhaser, firePhaserHandler);
	registerHandler(ActionType.FireTorpedo, fireTorpedoHandler);

	// Build ship
	const loadout = hydrateLoadout(flags);
	const pilot = resolvePilot(flags);
	const nodeId = flags.node ? parseInt(flags.node, 10) : 1;

	const clock = createClock(0);
	const rng = createRng(42);
	const ship = createShip(loadout, clock, rng, { nodeId, pilot });
	const engine = createEngine(clock);

	// Build action params
	const params: Record<string, unknown> = {};
	if (flags.distance) {
		params.distance = parseFloat(flags.distance);
	}
	if (flags['target-node']) {
		params.target_node_id = parseInt(flags['target-node'], 10);
	}
	if (flags.throttle) {
		params.throttle = parseFloat(flags.throttle);
	}
	if (flags.effort) {
		params.effort = parseFloat(flags.effort);
	}

	// Capture before state
	const beforeState = resolveState(ship.resolve());

	// Preview
	const preview = engine.previewAction(ship, actionType as ActionType, params);

	// Submit and resolve
	const submitted = engine.submitAction(ship, actionType as ActionType, params);
	engine.advanceUntilIdle();

	// Capture after state
	const afterState = resolveState(ship.resolve());

	const output = {
		loadout: loadoutSlugs(loadout),
		action: {
			type: submitted.type,
			status: submitted.status,
			duration: submitted.result.duration ?? null,
			createdAt: submitted.createdAt,
			deferredUntil: submitted.deferredUntil,
			params: submitted.params,
			result: submitted.result,
		},
		before: beforeState,
		after: afterState,
		preview: {
			valid: preview.valid,
			...(preview.error ? { error: preview.error } : {}),
			...(preview.intent ? { intent: preview.intent } : {}),
			...(preview.projectedState ? { projectedState: resolveState(preview.projectedState) } : {}),
		},
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}
