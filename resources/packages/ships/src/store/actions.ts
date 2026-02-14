import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
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
	async ( { dispatch, registry } ) => {
		dispatch( { type: 'FETCH_SYSTEMS_START', shipId } );

		try {
			const systems = await apiFetch< SystemComponentResponse[] >( {
				path: `/helm/v1/ships/${ shipId }/systems?_embed[]=${ LinkRel.Product }`,
			} );

			dispatch( { type: 'FETCH_SYSTEMS_FINISHED', shipId, systems } );

			const products = systems
				.map( ( system ) => system._embedded?.[ LinkRel.Product ]?.[ 0 ] )
				.filter( ( p ): p is NonNullable< typeof p > => p !== undefined );

			if ( products.length > 0 ) {
				registry.dispatch( productsStore ).receiveProducts( products );
			}
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

export const patchPowerMode =
	( shipId: number, powerMode: string ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'PATCH_SHIP_START', shipId } );

		try {
			const ship = await apiFetch< WithRestLinks< ShipState > >( {
				path: `/helm/v1/ships/${ shipId }`,
				method: 'PATCH',
				data: { power_mode: powerMode },
			} );

			dispatch( { type: 'PATCH_SHIP_FINISHED', shipId, ship } );
		} catch ( error ) {
			const helmError = await HelmError.asyncFrom( error );

			dispatch( {
				type: 'PATCH_SHIP_FAILED',
				shipId,
				error: helmError.isSafe
					? helmError
					: HelmError.safe(
							ErrorCode.ShipsPatchFailed,
							__( 'Could not patch ship.', 'helm' ),
							helmError
					  ),
			} );
		}
	};

export const receiveShipEmbeds =
	( shipId: number, embedded: ShipEmbeds ): Thunk< Action, typeof store > =>
	async ( { dispatch, registry } ) => {
		const systems = embedded[ LinkRel.Systems ];

		if ( systems ) {
			dispatch( receiveSystems( shipId, systems ) );

			const products = systems
				.map( ( system ) => system._embedded?.[ LinkRel.Product ]?.[ 0 ] )
				.filter( ( p ): p is NonNullable< typeof p > => p !== undefined );

			if ( products.length > 0 ) {
				registry.dispatch( productsStore ).receiveProducts( products );
			}
		}
	};
