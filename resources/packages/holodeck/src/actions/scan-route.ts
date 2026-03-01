import type { Ship } from '../ship';
import type { Action, ActionHandler, ActionIntent, ActionOutcome } from './types';
import { ActionError, ActionErrorCode } from './types';
import { ActionStatus } from '../enums/action-status';

export const scanRouteHandler: ActionHandler = {
	validate(ship: Ship, params: Record<string, unknown>): void {
		const state = ship.resolve();

		if (state.nodeId === null) {
			throw new ActionError(
				ActionErrorCode.ShipNoPosition,
				'Ship has no position',
			);
		}

		if (params.target_node_id === undefined) {
			throw new ActionError(
				ActionErrorCode.NavigationMissingTarget,
				'Missing target_node_id',
			);
		}

		if (params.target_node_id === state.nodeId) {
			throw new ActionError(
				ActionErrorCode.NavigationAlreadyAtTarget,
				'Already at target node',
			);
		}
	},

	handle(
		ship: Ship,
		params: Record<string, unknown>,
		now: number,
	): ActionIntent {
		const state = ship.resolve();
		const distance = (params.distance as number) ?? 1;
		const effort = (params.effort as number) ?? 1.0;

		const successChance = ship.sensors.getScanSuccessChance(distance, effort);
		const powerCost = ship.sensors.getScanPowerCost(distance);
		const duration = ship.sensors.getScanDuration(distance, effort);

		return {
			deferredUntil: now + duration,
			result: {
				from_node_id: state.nodeId,
				to_node_id: params.target_node_id as number,
				distance,
				effort,
				success_chance: successChance,
				power_cost: powerCost,
				duration,
			},
		};
	},

	resolve(ship: Ship, action: Action): ActionOutcome {
		const powerCost = action.result.power_cost as number;
		const successChance = action.result.success_chance as number;

		ship.consumePower(powerCost);
		const roll = ship.rng.next();

		return {
			status: ActionStatus.Fulfilled,
			result: {
				success: roll <= successChance,
				roll,
			},
		};
	},
};
