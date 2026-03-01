import type { ActionType } from '../enums/action-type';

export interface ShipAction {
	t: number;
	shipId: string;
	type: ActionType;
	params?: Record<string, unknown>;
}
