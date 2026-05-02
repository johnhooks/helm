import type { ActionType } from '../enums/action-type';
import type { ActionHandler } from './types';

const handlers = new Map<ActionType, ActionHandler>();

export function registerHandler(
	type: ActionType,
	handler: ActionHandler
): void {
	handlers.set(type, handler);
}

export function getHandler(type: ActionType): ActionHandler | undefined {
	return handlers.get(type);
}
