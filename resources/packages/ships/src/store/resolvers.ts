import type { Thunk } from '@helm/types';
import type { Action } from './types';
import type { store } from './index';

export const getShip =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		await dispatch.fetchShip( shipId );
	};

export const getSystems =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		await dispatch.fetchSystems( shipId );
	};
