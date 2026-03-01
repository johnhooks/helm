export const ActionStatus = {
	Pending: 'pending',
	Running: 'running',
	Fulfilled: 'fulfilled',
	Partial: 'partial',
	Failed: 'failed',
} as const;

export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];

const COMPLETE_STATUSES: ReadonlySet<ActionStatus> = new Set([
	ActionStatus.Fulfilled,
	ActionStatus.Partial,
	ActionStatus.Failed,
]);

const SUCCESS_STATUSES: ReadonlySet<ActionStatus> = new Set([
	ActionStatus.Fulfilled,
	ActionStatus.Partial,
]);

export function isActionComplete(status: ActionStatus): boolean {
	return COMPLETE_STATUSES.has(status);
}

export function isActionSuccess(status: ActionStatus): boolean {
	return SUCCESS_STATUSES.has(status);
}
