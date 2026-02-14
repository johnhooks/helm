import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import { LinkRel } from '@helm/types';
import type { ShipState, SystemComponentResponse, Thunk, ThunkArgs, WithRestLinks } from '@helm/types';
import type { Action, ShipEmbeds, ShipResponse } from './types';
import type { store } from './index';

type StoreThunkArgs = ThunkArgs< Action, typeof store >;

export const fetchShip =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'FETCH_SHIP_START' } );

		try {
			const response = await apiFetch< ShipResponse >( {
				path: `/helm/v1/ships/${ shipId }?_embed[]=${ LinkRel.Systems }`,
			} );

			const { _embedded, ...ship } = response;

			dispatch( { type: 'FETCH_SHIP_FINISHED', ship } );

			if ( _embedded ) {
				dispatch.receiveShipEmbeds( _embedded );
			}
		} catch ( error ) {
			const helmError = await HelmError.asyncFrom( error );

			dispatch( {
				type: 'FETCH_SHIP_FAILED',
				error: helmError.isSafe
					? helmError
					: HelmError.safe( ErrorCode.ShipsInvalidResponse, __( 'Could not load ship data.', 'helm' ), helmError ),
			} );
		}
	};

export function receiveShip(
	ship: WithRestLinks< ShipState >
): Action {
	return { type: 'RECEIVE_SHIP', ship };
}

export const fetchSystems =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch, registry } ) => {
		dispatch( { type: 'FETCH_SYSTEMS_START' } );

		try {
			const systems = await apiFetch< SystemComponentResponse[] >( {
				path: `/helm/v1/ships/${ shipId }/systems?_embed[]=${ LinkRel.Product }`,
			} );

			dispatch( { type: 'FETCH_SYSTEMS_FINISHED', systems } );

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
				error: helmError.isSafe
					? helmError
					: HelmError.safe( ErrorCode.ShipsSystemsInvalidResponse, __( 'Could not load ship systems.', 'helm' ), helmError ),
			} );
		}
	};

export function receiveSystems(
	systems: SystemComponentResponse[]
): Action {
	return { type: 'RECEIVE_SYSTEMS', systems };
}

export function editShip( edits: Partial< ShipState > ): Action {
	return { type: 'EDIT_SHIP', edits };
}

export const patchShip =
	( shipId: number, edits: Partial< ShipState > ): ( args: StoreThunkArgs ) => Promise< HelmError | null > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'PATCH_SHIP_START', edits } );

		try {
			const ship = await apiFetch< WithRestLinks< ShipState > >( {
				path: `/helm/v1/ships/${ shipId }`,
				method: 'PATCH',
				data: edits,
			} );

			dispatch( { type: 'PATCH_SHIP_FINISHED', ship } );
			return null;
		} catch ( error ) {
			const helmError = await HelmError.asyncFrom( error );

			const safeError = helmError.isSafe
				? helmError
				: HelmError.safe(
						ErrorCode.ShipsPatchFailed,
						__( 'Could not patch ship.', 'helm' ),
						helmError
				  );

			dispatch( { type: 'PATCH_SHIP_FAILED', error: safeError } );
			return safeError;
		}
	};

export const receiveShipEmbeds =
	( embedded: ShipEmbeds ): Thunk< Action, typeof store > =>
	async ( { dispatch, registry } ) => {
		const systems = embedded[ LinkRel.Systems ];

		if ( systems ) {
			dispatch( receiveSystems( systems ) );

			const products = systems
				.map( ( system ) => system._embedded?.[ LinkRel.Product ]?.[ 0 ] )
				.filter( ( p ): p is NonNullable< typeof p > => p !== undefined );

			if ( products.length > 0 ) {
				registry.dispatch( productsStore ).receiveProducts( products );
			}
		}
	};
