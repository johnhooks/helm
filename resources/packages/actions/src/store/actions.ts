import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { ErrorCode, HelmError } from '@helm/errors';
import type { Thunk } from '@helm/types';
import type { Action, DraftAction, ShipAction } from './types';
import type { store } from './index';

export const createAction =
	( shipId: number, actionType: string, params: Record< string, unknown > = {} ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'CREATE_ACTION_START', shipId } );

		try {
			const action = await apiFetch< ShipAction >( {
				path: `/helm/v1/ships/${ shipId }/actions`,
				method: 'POST',
				data: { type: actionType, params },
			} );

			dispatch( { type: 'CREATE_ACTION_FINISHED', shipId, action } );
		} catch ( error ) {
			dispatch( {
				type: 'CREATE_ACTION_FAILED',
				shipId,
				error: HelmError.safe( ErrorCode.ActionsCreateFailed, __( 'Helm failed to initialize your requested ship action.', 'helm' ), await HelmError.asyncFrom( error ) ),
			} );
		}
	};

export const fetchCurrentAction =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'FETCH_ACTION_START', shipId } );

		try {
			const action = await apiFetch< ShipAction >( {
				path: `/helm/v1/ships/${ shipId }/actions/current`,
			} );

			dispatch( { type: 'FETCH_ACTION_FINISHED', shipId, action } );
		} catch ( error ) {
			const helmError = await HelmError.asyncFrom( error );

			// 404 means no active action — that's a valid state, not an error.
			if ( helmError.message === 'helm.action.none' ) {
				dispatch( { type: 'FETCH_ACTION_FINISHED', shipId, action: null } );
				return;
			}

			dispatch( {
				type: 'FETCH_ACTION_FAILED',
				shipId,
				error: HelmError.safe( ErrorCode.ActionsInvalidResponse, __( 'Helm failed to load your ships current action.', 'helm' ), helmError ),
			} );
		}
	};

export function receiveAction( shipId: number, action: ShipAction ): Action {
	return { type: 'RECEIVE_ACTION', shipId, action };
}

export function receiveHeartbeat( actions: ShipAction[], cursor: string ): Action {
	return { type: 'RECEIVE_HEARTBEAT', actions, cursor };
}

export function clearAction( shipId: number ): Action {
	return { type: 'CLEAR_ACTION', shipId };
}

export function draftCreate( action: DraftAction ): Action {
	return { type: 'CREATE_DRAFT', action };
}

export function clearDraft(): Action {
	return { type: 'CLEAR_DRAFT' };
}

export const submitDraft =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch, select } ) => {
		const draft = select.getDraft();
		if ( ! draft ) {
			return;
		}

		dispatch.createAction( shipId, draft.type, draft.params );
	};
