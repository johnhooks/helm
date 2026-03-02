import type { ActionType } from '../enums/action-type';
import type { ActionStatus } from '../enums/action-status';
import type { Ship } from '../ship';
import type { ShipState } from '../types/ship-state';

export interface Action {
	id: number;
	shipId: string;
	type: ActionType;
	params: Record<string, unknown>;
	status: ActionStatus;
	createdAt: number;
	deferredUntil: number | null;
	result: Record<string, unknown>;
}

export interface ActionIntent {
	deferredUntil: number | null;
	result: Record<string, unknown>;
}

export interface ActionOutcome {
	status: ActionStatus;
	result: Record<string, unknown>;
}

export interface ActionPreview {
	valid: boolean;
	error?: string;
	intent?: ActionIntent;
	projectedState?: ShipState;
}

export interface ActionContext {
	getShip: (id: string) => Ship | undefined;
}

export interface ActionHandler {
	validate: (ship: Ship, params: Record<string, unknown>, context: ActionContext) => void;
	handle: (
		ship: Ship,
		params: Record<string, unknown>,
		now: number,
		context: ActionContext,
	) => ActionIntent;
	resolve: (ship: Ship, action: Action, context: ActionContext) => ActionOutcome;
}

export const ActionErrorCode = {
	ShipNoPosition: 'ship.no_position',
	ShipInsufficientCore: 'ship.insufficient_core',
	ShipInsufficientPower: 'ship.insufficient_power',
	NavigationMissingTarget: 'navigation.missing_target',
	NavigationAlreadyAtTarget: 'navigation.already_at_target',
	ActionInProgress: 'action.in_progress',
	ActionMissingParam: 'action.missing_param',
	ActionNoHandler: 'action.no_handler',
	TargetNotFound: 'target.not_found',
	TargetDestroyed: 'target.destroyed',
	ShipMissingEquipment: 'ship.missing_equipment',
	ShipInsufficientAmmo: 'ship.insufficient_ammo',
} as const;

export type ActionErrorCode =
	(typeof ActionErrorCode)[keyof typeof ActionErrorCode];

export class ActionError extends Error {
	constructor(
		readonly code: ActionErrorCode,
		message: string,
	) {
		super(message);
		this.name = 'ActionError';
	}
}
