import type { StoreDescriptor, ReduxStoreConfig } from '@wordpress/data';
import { createReduxStore, register, select, dispatch } from '@wordpress/data';
import { STORE_NAME } from './constants';
import * as actions from './actions';
import { reducer, initializeDefaultState } from './reducer';
import * as selectors from './selectors';
import * as resolvers from './resolvers';
import { log } from '@helm/core';
import type { State, ShipAction } from './types';

declare const jQuery: ( target: Document ) => {
	on: ( event: string, handler: ( ...args: unknown[] ) => void ) => void;
};

type Store = StoreDescriptor<
	ReduxStoreConfig< State, typeof actions, typeof selectors >
>;

export const store: Store = createReduxStore( STORE_NAME, {
	actions,
	reducer,
	selectors,
	resolvers,
	initialState: initializeDefaultState(),
} );

register( store );

// Subscribe to WordPress Heartbeat for action state updates.
jQuery( document ).on( 'heartbeat-send', ( ..._args: unknown[] ) => {
	const data = _args[ 1 ] as Record< string, unknown >;
	const cursor = select( store ).getCursor();
	data.helm_actions = { since: cursor ?? '' };
	log.debug( 'heartbeat.send', { cursor } );
} );

jQuery( document ).on( 'heartbeat-tick', ( ..._args: unknown[] ) => {
	const data = _args[ 1 ] as Record< string, unknown >;
	const response = data.helm_actions as { actions?: ShipAction[]; server_time?: string } | undefined;
	if ( ! response ) {
		log.debug( 'heartbeat.tick', { skipped: true } );
		return;
	}

	const receivedActions = response.actions ?? [];

	// Compute buffered cursor: server_time minus 5s overlap.
	let cursor = '';
	if ( response.server_time ) {
		const serverDate = new Date( response.server_time );
		serverDate.setSeconds( serverDate.getSeconds() - 5 );
		cursor = serverDate.toISOString();
	}

	log.debug( 'heartbeat.tick', { actions: receivedActions.length, cursor } );

	if ( cursor ) {
		dispatch( store ).receiveHeartbeat( receivedActions, cursor );
	}
} );
