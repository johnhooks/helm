import type { Clock } from '../clock';
import { createClock } from '../clock';
import { createRng } from '../rng';
import { ActionStatus } from '../enums/action-status';
import type { ActionType } from '../enums/action-type';
import type { Ship } from '../ship';
import type { Action, ActionPreview } from './types';
import { ActionError, ActionErrorCode } from './types';
import { getHandler } from './registry';

export class Engine {
	readonly clock: Clock;
	private readonly actions: Action[] = [];
	private readonly currentActionByShip = new Map<string, number>();
	private readonly shipsByAction = new Map<number, Ship>();
	private nextActionId = 1;

	constructor(clock: Clock) {
		this.clock = clock;
	}

	submitAction(
		ship: Ship,
		type: ActionType,
		params: Record<string, unknown> = {},
	): Action {
		const shipId = ship.resolve().id;

		if (this.currentActionByShip.has(shipId)) {
			throw new ActionError(
				ActionErrorCode.ActionInProgress,
				'An action is already in progress',
			);
		}

		const handler = getHandler(type);
		if (!handler) {
			throw new ActionError(
				ActionErrorCode.ActionNoHandler,
				`No handler registered for action type: ${type}`,
			);
		}

		handler.validate(ship, params);

		const now = this.clock.now();
		const intent = handler.handle(ship, params, now);

		const action: Action = {
			id: this.nextActionId++,
			shipId,
			type,
			params: { ...params },
			status: ActionStatus.Pending,
			createdAt: now,
			deferredUntil: intent.deferredUntil,
			result: { ...intent.result },
		};

		this.actions.push(action);
		this.shipsByAction.set(action.id, ship);

		if (intent.deferredUntil === null) {
			const outcome = handler.resolve(ship, action);
			action.status = outcome.status;
			Object.assign(action.result, outcome.result);
		} else {
			this.currentActionByShip.set(shipId, action.id);
		}

		return action;
	}

	advance(seconds: number): Action[] {
		this.clock.advance(seconds);
		return this.resolveReady();
	}

	advanceUntilIdle(): Action[] {
		const resolved: Action[] = [];
		let iterations = 0;

		while (this.currentActionByShip.size > 0 && iterations < 1000) {
			let earliest: number | null = null;

			for (const actionId of this.currentActionByShip.values()) {
				const action = this.actions.find((a) => a.id === actionId);
				if (action?.deferredUntil !== null && action?.deferredUntil !== undefined) {
					if (earliest === null || action.deferredUntil < earliest) {
						earliest = action.deferredUntil;
					}
				}
			}

			if (earliest === null) {
				break;
			}

			this.clock.advanceTo(earliest);
			resolved.push(...this.resolveReady());
			iterations++;
		}

		return resolved;
	}

	previewAction(
		ship: Ship,
		type: ActionType,
		params: Record<string, unknown> = {},
	): ActionPreview {
		const handler = getHandler(type);
		if (!handler) {
			return { valid: false, error: `No handler for action type: ${type}` };
		}

		const clonedClock = createClock(this.clock.now());
		const clonedRng = createRng(0);
		const clone = ship.createClone(clonedClock, clonedRng);

		try {
			handler.validate(clone, params);
		} catch (e) {
			if (e instanceof ActionError) {
				return { valid: false, error: e.message };
			}
			throw e;
		}

		const now = clonedClock.now();
		const intent = handler.handle(clone, params, now);

		const tempAction: Action = {
			id: 0,
			shipId: ship.resolve().id,
			type,
			params: { ...params },
			status: ActionStatus.Pending,
			createdAt: now,
			deferredUntil: intent.deferredUntil,
			result: { ...intent.result },
		};

		if (intent.deferredUntil !== null) {
			clonedClock.advanceTo(intent.deferredUntil);
		}

		handler.resolve(clone, tempAction);

		return {
			valid: true,
			intent,
			projectedState: clone.resolve(),
		};
	}

	getCurrentAction(ship: Ship): Action | null {
		const shipId = ship.resolve().id;
		const actionId = this.currentActionByShip.get(shipId);
		if (actionId === undefined) {
			return null;
		}
		return this.actions.find((a) => a.id === actionId) ?? null;
	}

	getActions(ship?: Ship): readonly Action[] {
		if (!ship) {
			return this.actions;
		}
		const shipId = ship.resolve().id;
		return this.actions.filter((a) => a.shipId === shipId);
	}

	private resolveReady(): Action[] {
		const resolved: Action[] = [];
		const now = this.clock.now();

		for (const [shipId, actionId] of this.currentActionByShip) {
			const action = this.actions.find((a) => a.id === actionId);
			if (
				!action ||
				action.deferredUntil === null ||
				action.deferredUntil > now
			) {
				continue;
			}

			const handler = getHandler(action.type);
			if (!handler) {
				continue;
			}

			const ship = this.shipsByAction.get(actionId);
			if (!ship) {
				continue;
			}

			const outcome = handler.resolve(ship, action);
			action.status = outcome.status;
			Object.assign(action.result, outcome.result);

			this.currentActionByShip.delete(shipId);
			resolved.push(action);
		}

		return resolved;
	}
}

export function createEngine(clock: Clock): Engine {
	return new Engine(clock);
}
