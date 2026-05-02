import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import { LinkRel } from '@helm/types';
import type { SystemComponentResponse, Thunk } from '@helm/types';
import type { Action, ShipResponse } from './types';
import type { store } from './index';

export const getShip =
	(shipId: number): Thunk<Action, typeof store> =>
	async ({ dispatch }) => {
		try {
			const response = await apiFetch<ShipResponse>({
				path: `/helm/v1/ships/${shipId}?_embed[]=${LinkRel.Systems}`,
			});

			const { _embedded, ...ship } = response;

			dispatch({ type: 'FETCH_SHIP_FINISHED', ship });

			if (_embedded) {
				dispatch.receiveShipEmbeds(_embedded);
			}
		} catch (error) {
			dispatch({
				type: 'FETCH_SHIP_FAILED',
				error: HelmError.safe(
					ErrorCode.ShipsInvalidResponse,
					__('Ship link failed to retrieve ship state', 'helm'),
					await HelmError.asyncFrom(error)
				),
			});
		}
	};

export const getSystems =
	(shipId: number): Thunk<Action, typeof store> =>
	async ({ dispatch, registry }) => {
		try {
			const systems = await apiFetch<SystemComponentResponse[]>({
				path: `/helm/v1/ships/${shipId}/systems?_embed[]=${LinkRel.Product}`,
			});

			dispatch({ type: 'FETCH_SYSTEMS_FINISHED', systems });

			const products = systems
				.map((system) => system._embedded?.[LinkRel.Product]?.[0])
				.filter((p): p is NonNullable<typeof p> => p !== undefined);

			if (products.length > 0) {
				registry.dispatch(productsStore).receiveProducts(products);
			}
		} catch (error) {
			dispatch({
				type: 'FETCH_SYSTEMS_FAILED',
				error: HelmError.safe(
					ErrorCode.ShipsSystemsInvalidResponse,
					__(
						'Ship link failed to retrieve system components',
						'helm'
					),
					await HelmError.asyncFrom(error)
				),
			});
		}
	};
