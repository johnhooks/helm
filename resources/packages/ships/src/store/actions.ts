import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import type { ShipState, Thunk } from '@helm/types';
import type { Action } from './types';
import type { store } from './index';

export const fetchShip =
	( shipId: number = window.helm.settings.shipId ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'FETCH_SHIP_START', shipId } );

		try {
			const ship = await apiFetch< ShipState >( {
				path: `/helm/v1/ships/${ shipId }`,
			} );

			dispatch( { type: 'FETCH_SHIP_FINISHED', shipId, ship } );
		} catch ( error ) {
			const helmError = await HelmError.asyncFrom( error );

			dispatch( {
				type: 'FETCH_SHIP_FAILED',
				shipId,
				error: helmError.isSafe
					? helmError
					: HelmError.safe( ErrorCode.ShipsInvalidResponse, __( 'Could not load ship data.', 'helm' ), helmError ),
			} );
		}
	};

export function receiveShip( shipId: number, ship: ShipState ): Action {
	return { type: 'FETCH_SHIP_FINISHED', shipId, ship };
}
