import type { ActionType } from '../enums/action-type';
import type { ActionStatus } from '../enums/action-status';
import type { Ship } from '../ship';
import type { ShipState } from '../types/ship-state';
import type { NavGraph } from '../nav-graph';
import type { EmissionType, SpectralType, DriveEnvelope } from '@helm/formulas';

export interface EmissionDeclaration {
	emissionType: EmissionType;
	spectralType: SpectralType;
	basePower: number;
	nodeId?: number;
	envelope?: DriveEnvelope;
	label?: string;
}

export interface EmissionRecord {
	id: number;
	shipId: string;
	actionId: number;
	nodeId: number;
	emissionType: EmissionType;
	spectralType: SpectralType;
	basePower: number;
	startedAt: number;
	endedAt: number | null;
	envelope?: DriveEnvelope;
	label?: string;
}

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
	emissions?: EmissionDeclaration[];
}

export interface ActionOutcome {
	status: ActionStatus;
	result: Record<string, unknown>;
	deferredUntil?: number | null;
	emissions?: EmissionDeclaration[];
}

export interface ActionPreview {
	valid: boolean;
	error?: string;
	intent?: ActionIntent;
	projectedState?: ShipState;
}

export interface ActionContext {
	getShip: (id: string) => Ship | undefined;
	getGraph?: () => NavGraph | undefined;
	getActiveEmissions?: (nodeId: number, atTime?: number) => EmissionRecord[];
}

export interface ActionHandler {
	validate: (
		ship: Ship,
		params: Record<string, unknown>,
		context: ActionContext
	) => void;
	handle: (
		ship: Ship,
		params: Record<string, unknown>,
		now: number,
		context: ActionContext
	) => ActionIntent;
	resolve: (
		ship: Ship,
		action: Action,
		context: ActionContext
	) => ActionOutcome;
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
	NavigationNoGraph: 'navigation.no_graph',
	NavigationNoRoute: 'navigation.no_route',
} as const;

export type ActionErrorCode =
	(typeof ActionErrorCode)[keyof typeof ActionErrorCode];

export class ActionError extends Error {
	constructor(
		readonly code: ActionErrorCode,
		message: string
	) {
		super(message);
		this.name = 'ActionError';
	}
}
