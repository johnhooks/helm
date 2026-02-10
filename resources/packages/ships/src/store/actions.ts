import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import { LinkRel } from '@helm/types';
import type { ShipState, SystemComponentResponse, Thunk, WithRestLinks } from '@helm/types';
import type { Action, ShipEmbeds, ShipResponse } from './types';
import type { store } from './index';

export const fetchShip =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'FETCH_SHIP_START', shipId } );

		try {
			const response = await apiFetch< ShipResponse >( {
				path: `/helm/v1/ships/${ shipId }?_embed[]=${ LinkRel.Systems }`,
			} );

			const { _embedded, ...ship } = response;

			dispatch( { type: 'FETCH_SHIP_FINISHED', shipId, ship } );

			if ( _embedded ) {
				dispatch.receiveShipEmbeds( shipId, _embedded );
			}
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

export function receiveShip(
	shipId: number,
	ship: WithRestLinks< ShipState >
): Action {
	return { type: 'FETCH_SHIP_FINISHED', shipId, ship };
}

export const fetchSystems =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'FETCH_SYSTEMS_START', shipId } );

		try {
			const systems = await apiFetch< SystemComponentResponse[] >( {
				path: `/helm/v1/ships/${ shipId }/systems`,
			} );

			dispatch( { type: 'FETCH_SYSTEMS_FINISHED', shipId, systems } );
		} catch ( error ) {
			const helmError = await HelmError.asyncFrom( error );

			dispatch( {
				type: 'FETCH_SYSTEMS_FAILED',
				shipId,
				error: helmError.isSafe
					? helmError
					: HelmError.safe( ErrorCode.ShipsSystemsInvalidResponse, __( 'Could not load ship systems.', 'helm' ), helmError ),
			} );
		}
	};

export function receiveSystems(
	shipId: number,
	systems: SystemComponentResponse[]
): Action {
	return { type: 'FETCH_SYSTEMS_FINISHED', shipId, systems };
}

export const receiveShipEmbeds =
	( shipId: number, embedded: ShipEmbeds ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		const systems = embedded[ LinkRel.Systems ];

		if ( systems ) {
			dispatch( receiveSystems( shipId, systems ) );
		}
	};
