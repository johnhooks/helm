import type { HelmError } from '@helm/errors';
import type { DraftAction, ShipAction, State } from './types';

export const getCurrentAction = (
	state: State,
	shipId: number
): ShipAction | null => state.actions.byShipId[ shipId ] ?? null;

export const getError = (
	state: State,
	shipId: number
): HelmError | null => state.actions.errors[ shipId ] ?? null;

export const getDraft = (
	state: State
): DraftAction | null => state.create.isDraft ? state.create.action : null;

export const isCreating = (
	state: State
): boolean => state.create.isSubmitting;

export const getCreateError = (
	state: State
): HelmError | null => state.create.error;

export const getCursor = (
	state: State
): string | null => state.meta.cursor;
