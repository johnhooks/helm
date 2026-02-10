import type { HelmError } from '@helm/errors';
import type { ShipState, SystemComponentResponse, WithRestLinks } from '@helm/types';
import type { State } from './types';

export const getShip = (
	state: State,
	shipId: number
): WithRestLinks< ShipState > | undefined => state.ships.byId[ shipId ];

export const isShipLoading = (
	state: State,
	shipId: number
): boolean => state.ships.isLoading[ shipId ] ?? false;

export const getShipError = (
	state: State,
	shipId: number
): HelmError | undefined => state.ships.errors[ shipId ];

export const getSystems = (
	state: State,
	shipId: number
): SystemComponentResponse[] | undefined => state.systems.byShipId[ shipId ];

export const areSystemsLoading = (
	state: State,
	shipId: number
): boolean => state.systems.isLoading[ shipId ] ?? false;

export const getSystemsError = (
	state: State,
	shipId: number
): HelmError | undefined => state.systems.errors[ shipId ];
