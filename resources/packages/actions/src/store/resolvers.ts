import type { Thunk } from '@helm/types';
import type { Action } from './types';
import type { store } from './index';

export const getCurrentAction =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		await dispatch.fetchCurrentAction( shipId );
	};
