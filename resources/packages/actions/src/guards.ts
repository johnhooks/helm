/**
 * Type guards for narrowing ShipAction by action type and status.
 *
 * Compose type + status guards for full narrowing:
 *   if ( isScanRoute( action ) && isFulfilled( action ) ) {
 *     action.result.nodes; // fully typed
 *   }
 */
import type { ActionContract } from './contracts';
import type { DraftAction, ShipAction, ShipActionType } from './store/types';

// -- Narrowed action types ----------------------------------------------------

export type ActiveAction< T extends ShipActionType = ShipActionType > = ShipAction< T > & {
	status: 'pending' | 'running';
	result: ActionContract< T >[ 'activeResult' ] | null;
};

export type FulfilledAction< T extends ShipActionType = ShipActionType > = ShipAction< T > & {
	status: 'fulfilled' | 'partial';
	result: ActionContract< T >[ 'fulfilledResult' ];
};

export type FailedAction< T extends ShipActionType = ShipActionType > = ShipAction< T > & {
	status: 'failed';
	result: ActionContract< T >[ 'failedResult' ];
};

// -- Action type guards -------------------------------------------------------

export function isScanRoute( action: ShipAction ): action is ShipAction< 'scan_route' >;
export function isScanRoute( draft: DraftAction ): draft is DraftAction< 'scan_route' >;
export function isScanRoute( value: ShipAction | DraftAction ): boolean {
	return value.type === 'scan_route';
}

export function isJump( action: ShipAction ): action is ShipAction< 'jump' >;
export function isJump( draft: DraftAction ): draft is DraftAction< 'jump' >;
export function isJump( value: ShipAction | DraftAction ): boolean {
	return value.type === 'jump';
}

// -- Status guards (generic, preserve the type param) -------------------------

export function isActive< T extends ShipActionType >(
	action: ShipAction< T >,
): action is ActiveAction< T > {
	return action.status === 'pending' || action.status === 'running';
}

export function isFulfilled< T extends ShipActionType >(
	action: ShipAction< T >,
): action is FulfilledAction< T > {
	return action.status === 'fulfilled' || action.status === 'partial';
}

export function isFailed< T extends ShipActionType >(
	action: ShipAction< T >,
): action is FailedAction< T > {
	return action.status === 'failed';
}
