import type { Thunk } from '@helm/types';
import type { Action } from './types';
import type { store } from './index';

export const getProduct =
	(productId: number): Thunk<Action, typeof store> =>
	async ({ dispatch }) => {
		await dispatch.fetchProduct(productId);
	};
