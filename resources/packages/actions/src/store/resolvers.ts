import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import type { Thunk } from '@helm/types';
import type { Action, ShipAction } from './types';
import type { store } from './index';
import { createIndexQueryId } from './utils';
import li from 'li';

export const getActions =
	(shipId: number): Thunk<Action, typeof store> =>
	async ({ dispatch }) => {
		const queryId = createIndexQueryId(shipId);
		dispatch({ type: 'FETCH_ACTIONS_START', queryId });

		try {
			const response = await apiFetch({
				path: `/helm/v1/ships/${shipId}/actions`,
				parse: false as const,
			});

			const actions = (await response.json()) as ShipAction[];
			const linkHeader = response.headers.get('Link');
			const links = linkHeader
				? (li.parse(linkHeader) as Record<string, string>)
				: {};

			dispatch({
				type: 'FETCH_ACTIONS_FINISHED',
				queryId,
				actions,
				next: links.next ?? null,
			});
		} catch (error) {
			dispatch({
				type: 'FETCH_ACTIONS_FAILED',
				queryId,
				error: HelmError.safe(
					ErrorCode.ActionsInvalidResponse,
					__('Ship link failed to retrieve the ship log', 'helm'),
					await HelmError.asyncFrom(error)
				),
			});
		}
	};

export const getAction =
	(actionId: number): Thunk<Action, typeof store> =>
	async ({ dispatch }) => {
		dispatch({ type: 'FETCH_ACTION_START', actionId });

		try {
			const action = await apiFetch<ShipAction>({
				path: `/helm/v1/actions/${actionId}`,
			});

			dispatch({ type: 'FETCH_ACTION_FINISHED', action });
		} catch (error) {
			dispatch({
				type: 'FETCH_ACTION_FAILED',
				actionId,
				error: HelmError.safe(
					ErrorCode.ActionsInvalidResponse,
					__('Ship link failed to retrieve action data', 'helm'),
					await HelmError.asyncFrom(error)
				),
			});
		}
	};
