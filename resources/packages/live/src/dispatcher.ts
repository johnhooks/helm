import { dispatch } from '@wordpress/data';
import { log } from '@helm/core';
import { store as actionsStore } from '@helm/actions';
import { store as shipsStore } from '@helm/ships';
import type { BroadcastEvent } from './types';

export function dispatchBroadcastEvent(event: BroadcastEvent): void {
	switch (event.type) {
		case 'ship.action.updated':
			dispatch(actionsStore).receiveAction(event.payload.action);
			break;

		case 'ship.state.updated':
			dispatch(shipsStore).receiveShipState(event.payload.ship_state);
			break;

		default:
			log.debug('live.event.unknown', { event });
	}
}

export function dispatchBroadcastEvents(events: BroadcastEvent[]): void {
	for (const event of events) {
		dispatchBroadcastEvent(event);
	}
}
