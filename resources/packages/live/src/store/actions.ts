import { log } from '@helm/core';
import { store as actionsStore } from '@helm/actions';
import { store as shipsStore } from '@helm/ships';
import type { Thunk } from '@helm/types';
import type { BroadcastEvent, BroadcastHeartbeatResponse } from '../types';
import type { Action, LiveChannelError } from './types';
import type { store } from './index';

declare const wp:
	| undefined
	| {
			heartbeat?: {
				connectNow?: () => void;
			};
	  };

export function subscribeChannel(
	channel: string,
	cursor: number | null = null
): Action {
	return { type: 'SUBSCRIBE_CHANNEL', channel, cursor };
}

export function setChannelCursor(channel: string, cursor: number): Action {
	return { type: 'SET_CHANNEL_CURSOR', channel, cursor };
}

export function setChannelError(
	channel: string,
	error: LiveChannelError
): Action {
	return { type: 'SET_CHANNEL_ERROR', channel, error };
}

export function clearChannelError(channel: string): Action {
	return { type: 'CLEAR_CHANNEL_ERROR', channel };
}

export const requestHeartbeatNow =
	(reason = 'manual'): Thunk<Action, typeof store> =>
	async () => {
		const heartbeat = typeof wp !== 'undefined' ? wp.heartbeat : undefined;

		if (typeof heartbeat?.connectNow !== 'function') {
			log.error('live.heartbeat.connect_now.unavailable', { reason });
			return;
		}

		heartbeat.connectNow();
		log.debug('live.heartbeat.connect_now', { reason });
	};

export const receiveHeartbeat =
	(response: BroadcastHeartbeatResponse): Thunk<Action, typeof store> =>
	async ({ dispatch, registry }) => {
		if (response.error) {
			log.warn('live.heartbeat.error', response.error);
		}

		const events: BroadcastEvent[] = [];
		const cursors: Array<{ channel: string; cursor: number }> = [];

		for (const [channel, channelResponse] of Object.entries(
			response.channels ?? {}
		)) {
			if (channelResponse.error) {
				dispatch.setChannelError(channel, channelResponse.error);
				continue;
			}

			dispatch.clearChannelError(channel);

			if (typeof channelResponse.cursor === 'number') {
				cursors.push({ channel, cursor: channelResponse.cursor });
			}

			events.push(...(channelResponse.events ?? []));
		}

		events.sort((a, b) => a.id - b.id);

		for (const event of events) {
			switch (event.type) {
				case 'ship.action.updated':
					await registry
						.dispatch(actionsStore)
						.receiveHeartbeat([event.payload.action]);
					break;

				case 'ship.state.updated':
					registry
						.dispatch(shipsStore)
						.receiveShipState(event.payload.ship_state);
					break;
			}
		}

		for (const { channel, cursor } of cursors) {
			dispatch.setChannelCursor(channel, cursor);
		}
	};
