import type { HelmError } from '@helm/errors';
import type { ShipAction, State } from './types';

export const getCurrentAction = (
	state: State,
	shipId: number
): ShipAction | null => state.actions.byShipId[ shipId ] ?? null;

export const isCreating = (
	state: State,
	shipId: number
): boolean => state.actions.creating[ shipId ] ?? false;

export const getError = (
	state: State,
	shipId: number
): HelmError | null => state.actions.errors[ shipId ] ?? null;

export const getCursor = (
	state: State
): string | null => state.meta.cursor;
