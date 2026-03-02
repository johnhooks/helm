import type { Ship } from '../ship';
import type { Action, ActionContext, ActionHandler, ActionIntent, ActionOutcome } from './types';
import { ActionError, ActionErrorCode } from './types';
import { ActionStatus } from '../enums/action-status';

export const jumpHandler: ActionHandler = {
	validate(ship: Ship, params: Record<string, unknown>, _context: ActionContext): void {
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

		const distance = (params.distance as number) ?? 1;
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
		_context: ActionContext,
	): ActionIntent {
		const state = ship.resolve();
		const distance = (params.distance as number) ?? 1;
		const throttle = (params.throttle as number) ?? 1.0;
		const targetNodeId = (params.target_node_id as number) ?? 0;

		const coreCost = ship.propulsion.getJumpCoreCost(distance, throttle);
		const powerCost = ship.propulsion.getJumpPowerCost(distance);
		const duration = ship.propulsion.getJumpDuration(distance, throttle);

		return {
			deferredUntil: now + duration,
			result: {
				from_node_id: state.nodeId,
				to_node_id: targetNodeId,
				distance,
				throttle,
				core_cost: coreCost,
				power_cost: powerCost,
				duration,
			},
		};
	},

	resolve(ship: Ship, action: Action, _context: ActionContext): ActionOutcome {
		const coreCost = action.result.core_cost as number;
		const powerCost = action.result.power_cost as number;
		const targetNodeId = action.result.to_node_id as number;

		ship.degradeCore(coreCost);
		ship.consumePower(powerCost);
		ship.moveToNode(targetNodeId);

		return {
			status: ActionStatus.Fulfilled,
			result: {
				remaining_core_life: ship.resolve().coreLife,
			},
		};
	},
};
