import type { HelmError } from '@helm/errors';
import type { ShipState } from '@helm/types';
import type { State } from './types';

export const getShip = (
	state: State,
	shipId: number
): ShipState | undefined => state.ships.byId[ shipId ];

export const isShipLoading = (
	state: State,
	shipId: number
): boolean => state.ships.isLoading[ shipId ] ?? false;

export const getShipError = (
	state: State,
	shipId: number
): HelmError | undefined => state.ships.errors[ shipId ];
