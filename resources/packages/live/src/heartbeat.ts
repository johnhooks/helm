import { log } from '@helm/core';
import {
	advanceBroadcastCursorFromEvents,
	getBroadcastCursor,
	setBroadcastCursor,
} from './cursor';
import { dispatchBroadcastEvents } from './dispatcher';
import type {
	BroadcastHeartbeatRequest,
	BroadcastHeartbeatResponse,
} from './types';

declare const jQuery:
	| undefined
	| ((target: Document) => {
			on: (event: string, handler: (...args: unknown[]) => void) => void;
	  });

function getChannels(): string[] {
	const shipId = window.helm?.settings?.shipId;
	return shipId ? [`private-ship.${shipId}`] : [];
}

function createRequest(): BroadcastHeartbeatRequest | null {
	const channels = getChannels();
	if (channels.length === 0) {
		return null;
	}

	return {
		channels,
		cursor: getBroadcastCursor(),
	};
}

export function registerHeartbeatTransport(): void {
	if (typeof jQuery === 'undefined') {
		return;
	}

	jQuery(document).on('heartbeat-send', (...args: unknown[]) => {
		const data = args[1] as Record<string, unknown>;
		const request = createRequest();

		if (!request) {
			return;
		}

		data.helm_broadcast = request;
		log.debug('live.heartbeat.send', request);
	});

	jQuery(document).on('heartbeat-tick', (...args: unknown[]) => {
		const data = args[1] as Record<string, unknown>;
		const response = data.helm_broadcast as
			| BroadcastHeartbeatResponse
			| undefined;

		if (!response) {
			log.debug('live.heartbeat.tick', { skipped: true });
			return;
		}

		const events = response.events ?? [];
		dispatchBroadcastEvents(events);

		if (typeof response.cursor === 'number') {
			setBroadcastCursor(response.cursor);
		} else {
			advanceBroadcastCursorFromEvents(events);
		}

		log.debug('live.heartbeat.tick', {
			events: events.length,
			cursor: getBroadcastCursor(),
		});
	});
}
