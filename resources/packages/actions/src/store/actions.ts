import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { assert, ErrorCode, HelmError } from '@helm/errors';
import type { Thunk } from '@helm/types';
import type { Action, DraftAction, ShipAction, ShipActionType } from './types';
import type { store } from './index';
import { createIndexQueryId } from './utils';
import li from 'li';

export const createAction =
	( shipId: number, actionType: ShipActionType, params: Record< string, unknown > = {} ): Thunk< Action, typeof store > =>
	async ( { dispatch } ) => {
		dispatch( { type: 'CREATE_ACTION_START' } );

		try {
			const action = await apiFetch< ShipAction >( {
				path: `/helm/v1/ships/${ shipId }/actions`,
				method: 'POST',
				data: { type: actionType, params },
			} );

			dispatch( { type: 'CREATE_ACTION_FINISHED', action } );
		} catch ( error ) {
			dispatch( {
				type: 'CREATE_ACTION_FAILED',
				error: HelmError.safe( ErrorCode.ActionsCreateFailed, __( 'Helm failed to initialize your requested ship action.', 'helm' ), await HelmError.asyncFrom( error ) ),
			} );
		}
	};

export function receiveAction( action: ShipAction ): Action {
	return { type: 'RECEIVE_ACTION', action };
}

export function receiveHeartbeat( actions: ShipAction[], cursor: string ): Action {
	return { type: 'RECEIVE_HEARTBEAT', actions, cursor };
}

export function draftCreate( action: DraftAction ): Action {
	return { type: 'CREATE_DRAFT', action };
}

export function clearDraft(): Action {
	return { type: 'CLEAR_DRAFT' };
}

/**
 * Submit the current draft action for the given ship.
 *
 * @throws {HelmError} If no draft exists.
 */
export const submitDraft =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch, select } ) => {
		const draft = select.getDraft();
		assert( draft, 'helm.actions.no_draft', 'submitDraft called without a draft' );

		dispatch.createAction( shipId, draft.type, draft.params );
	};

export const loadMore =
	( shipId: number ): Thunk< Action, typeof store > =>
	async ( { dispatch, select } ) => {
		const meta = select.getQueryMeta( shipId );

		// No next page or already loading — skip.
		if ( ! meta?.next || meta.isLoading ) {
			return;
		}

		const queryId = createIndexQueryId( shipId );
		dispatch( { type: 'LOAD_MORE_START', queryId } );

		try {
			const response = await apiFetch( {
				url: meta.next,
				parse: false as const,
			} );

			const actions = ( await response.json() ) as ShipAction[];
			const linkHeader = response.headers.get( 'Link' );
			const links = linkHeader ? ( li.parse( linkHeader ) as Record< string, string > ) : {};

			dispatch( { type: 'LOAD_MORE_FINISHED', queryId, actions, next: links.next ?? null } );
		} catch ( error ) {
			dispatch( {
				type: 'LOAD_MORE_FAILED',
				queryId,
				error: HelmError.safe( ErrorCode.ActionsInvalidResponse, __( 'Failed to load ship log.', 'helm' ), await HelmError.asyncFrom( error ) ),
			} );
		}
	};
