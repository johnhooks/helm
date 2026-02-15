import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import { LinkRel } from '@helm/types';
import type { ShipState, SystemComponentResponse, Thunk, ThunkArgs, WithRestLinks } from '@helm/types';
import type { Action, ShipEmbeds } from './types';
import type { store } from './index';

type StoreThunkArgs = ThunkArgs< Action, typeof store >;

export function receiveShip(
	ship: WithRestLinks< ShipState >
): Action {
	return { type: 'RECEIVE_SHIP', ship };
}

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
			const safeError = HelmError.safe(
				ErrorCode.ShipsPatchFailed,
				__( 'Could not patch ship.', 'helm' ),
				await HelmError.asyncFrom( error )
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
