import { emissionPower, DEFAULT_EMISSION_PROFILES } from '@helm/formulas';
import type { DriveEnvelope } from '@helm/formulas';
import type { Ship } from '../ship';
import type { Action, ActionContext, ActionHandler, ActionIntent, ActionOutcome } from './types';
import { ActionError, ActionErrorCode } from './types';
import { ActionStatus } from '../enums/action-status';

const DEFAULT_COOLDOWN_SECONDS = 120;

export const jumpHandler: ActionHandler = {
	validate(ship: Ship, params: Record<string, unknown>, context: ActionContext): void {
		const state = ship.resolve();

		if (state.nodeId === null) {
			throw new ActionError(
				ActionErrorCode.ShipNoPosition,
				'Ship has no position',
			);
		}

		if (!params.target_node_id && params.distance === undefined) {
			throw new ActionError(
				ActionErrorCode.NavigationMissingTarget,
				'Missing target_node_id or distance',
			);
		}

		if (params.target_node_id !== undefined && params.target_node_id === state.nodeId) {
			throw new ActionError(
				ActionErrorCode.NavigationAlreadyAtTarget,
				'Already at target node',
			);
		}

		const graph = context.getGraph?.();

		// When graph present, validate edge exists
		if (graph && params.target_node_id !== undefined) {
			if (!graph.hasEdge(state.nodeId, params.target_node_id as number)) {
				throw new ActionError(
					ActionErrorCode.NavigationNoRoute,
					'No discovered route to target node',
				);
			}
		}

		// Determine distance for core cost check
		let distance: number;
		if (graph && params.target_node_id !== undefined) {
			const edge = graph.getEdge(state.nodeId, params.target_node_id as number);
			distance = edge?.distance ?? (params.distance as number) ?? 1;
		} else {
			distance = (params.distance as number) ?? 1;
		}

		const throttle = (params.throttle as number) ?? 1.0;
		const coreCost = ship.propulsion.getJumpCoreCost(distance, throttle);

		if (state.coreLife < coreCost) {
			throw new ActionError(
				ActionErrorCode.ShipInsufficientCore,
				`Insufficient core life: need ${coreCost}, have ${state.coreLife}`,
			);
		}
	},

	handle(
		ship: Ship,
		params: Record<string, unknown>,
		now: number,
		context: ActionContext,
	): ActionIntent {
		const state = ship.resolve();
		const throttle = (params.throttle as number) ?? 1.0;
		const targetNodeId = (params.target_node_id as number) ?? 0;

		const graph = context.getGraph?.();
		let distance: number;

		if (graph && targetNodeId) {
			const edge = graph.getEdge(state.nodeId!, targetNodeId);
			distance = edge?.distance ?? (params.distance as number) ?? 1;
		} else {
			distance = (params.distance as number) ?? 1;
		}

		const coreCost = ship.propulsion.getJumpCoreCost(distance, throttle);
		const powerCost = ship.propulsion.getJumpPowerCost(distance);
		const spoolDuration = ship.propulsion.getJumpDuration(distance, throttle);

		// Read drive envelope from catalog — derive phase durations
		const envelope = ship.propulsion.getDriveEnvelope();
		const cooldownDuration = envelope?.cooldown.duration ?? DEFAULT_COOLDOWN_SECONDS;

		// Build spool envelope (spool-only — no sustain/cooldown phases)
		const spoolEnvelope: DriveEnvelope | undefined = envelope
			? {
				label: envelope.label,
				spool: envelope.spool,
				sustain: { duration: 0, peakPower: 0, curve: 1.0 },
				cooldown: { duration: 0, peakPower: 0, curve: 1.0 },
			}
			: undefined;

		return {
			deferredUntil: now + spoolDuration,
			result: {
				phase: 'spool',
				from_node_id: state.nodeId,
				to_node_id: targetNodeId,
				distance,
				throttle,
				core_cost: coreCost,
				power_cost: powerCost,
				spool_duration: spoolDuration,
				cooldown_duration: cooldownDuration,
				spool_started_at: now,
			},
			emissions: [{
				emissionType: 'drive_spool',
				spectralType: DEFAULT_EMISSION_PROFILES.drive_spool.spectralType,
				basePower: emissionPower('drive_spool'),
				envelope: spoolEnvelope,
			}],
		};
	},

	resolve(ship: Ship, action: Action, context: ActionContext): ActionOutcome {
		const phase = action.result.phase as string;

		if (phase === 'spool') {
			// Spool complete — ship jumps to destination
			const coreCost = action.result.core_cost as number;
			const powerCost = action.result.power_cost as number;
			const targetNodeId = action.result.to_node_id as number;
			const fromNodeId = action.result.from_node_id as number;
			const cooldownDuration = action.result.cooldown_duration as number;

			ship.degradeCore(coreCost);
			ship.consumePower(powerCost);
			ship.moveToNode(targetNodeId);

			const graph = context.getGraph?.();
			if (graph && fromNodeId && targetNodeId) {
				graph.incrementTraversal(fromNodeId, targetNodeId);
			}

			// Build cooldown-only envelope (no spool/sustain phases)
			const envelope = ship.propulsion.getDriveEnvelope();
			const cooldownEnvelope: DriveEnvelope | undefined = envelope
				? {
					label: envelope.label,
					spool: { duration: 0, peakPower: 0, curve: 1.0 },
					sustain: { duration: 0, peakPower: 0, curve: 1.0 },
					cooldown: envelope.cooldown,
				}
				: undefined;

			return {
				status: ActionStatus.Pending,
				deferredUntil: action.deferredUntil! + cooldownDuration,
				result: {
					phase: 'cooldown',
					spool_ended_at: action.deferredUntil,
					cooldown_started_at: action.deferredUntil,
				},
				emissions: [{
					emissionType: 'drive_cooldown',
					spectralType: DEFAULT_EMISSION_PROFILES.drive_cooldown.spectralType,
					basePower: emissionPower('drive_cooldown'),
					envelope: cooldownEnvelope,
				}],
			};
		}

		// phase === 'cooldown' — cooldown complete
		return {
			status: ActionStatus.Fulfilled,
			result: {
				phase: 'complete',
				cooldown_ended_at: action.deferredUntil,
				remaining_core_life: ship.resolve().coreLife,
			},
		};
	},
};
