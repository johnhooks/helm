import { createSelector } from '@wordpress/data';
import type { HelmError } from '@helm/errors';
import type {
	DraftAction,
	QueryMeta,
	ShipAction,
	ShipActionType,
	State,
} from './types';
import { createIndexQueryId } from './utils';

export const getActions = createSelector(
	(state: State, shipId: number): ShipAction[] => {
		const ids = state.actions.queries[createIndexQueryId(shipId)];
		if (!ids) {
			return [];
		}
		return ids
			.map((id) => state.actions.byId[id])
			.filter(Boolean) as ShipAction[];
	},
	(state: State, shipId: number) => [
		state.actions.queries[createIndexQueryId(shipId)],
		state.actions.byId,
	]
);

export const getAction = (state: State, actionId: number): ShipAction | null =>
	state.actions.byId[actionId] ?? null;

export const getLatestAction = createSelector(
	(state: State, type?: ShipActionType): ShipAction | null => {
		let latest: ShipAction | null = null;
		for (const action of Object.values(state.actions.byId)) {
			if (type && action.type !== type) {
				continue;
			}
			if (!latest || action.id > latest.id) {
				latest = action;
			}
		}
		return latest;
	},
	(state: State, type?: ShipActionType) => [type, state.actions.byId]
);

export const getDraft = (state: State): DraftAction | null =>
	state.create.isDraft ? state.create.action : null;

export const isCreating = (state: State): boolean => state.create.isSubmitting;

export const getCreateError = (state: State): HelmError | null =>
	state.create.error;

export const getQueryMeta = (state: State, shipId: number): QueryMeta | null =>
	state.actions.meta[createIndexQueryId(shipId)] ?? null;

export const canLoadMore = (state: State, shipId: number): boolean => {
	const meta = state.actions.meta[createIndexQueryId(shipId)];
	return !!meta?.next;
};

export const isLoading = (state: State, shipId: number): boolean => {
	const meta = state.actions.meta[createIndexQueryId(shipId)];
	return meta?.isLoading === true;
};

export const isLoadingAction = (state: State, actionId: number): boolean =>
	state.actions.isLoading[actionId] ?? false;

export const getActionError = (
	state: State,
	actionId: number
): HelmError | null => state.actions.error[actionId] ?? null;

export const getHeartbeatCursor = (state: State): string | null =>
	state.heartbeat.cursor;
