import { dispatch, select } from '@wordpress/data';
import { log } from '@helm/core';
import { store } from './store';
import type {
	BroadcastHeartbeatRequest,
	BroadcastHeartbeatResponse,
} from './types';

declare const jQuery:
	| undefined
	| ((target: Document) => {
			on: (event: string, handler: (...args: unknown[]) => void) => void;
	  });

const RESUME_HEARTBEAT_AFTER_MS = 60_000;
let lastHeartbeatAt = Date.now();

function subscribeInitialShipChannel(): void {
	const shipId = window.helm?.settings?.shipId;
	if (!shipId) {
		return;
	}

	const channel = `private-ship.${shipId}`;
	const cursor = window.helm?.settings?.liveCursors?.[channel] ?? null;
	dispatch(store).subscribeChannel(channel, cursor);
}

function requestResumeHeartbeat(reason: string): void {
	const elapsed = Date.now() - lastHeartbeatAt;
	if (elapsed < RESUME_HEARTBEAT_AFTER_MS) {
		return;
	}

	dispatch(store).requestHeartbeatNow(reason);
}

function registerResumeHeartbeatTrigger(): void {
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) {
			requestResumeHeartbeat('visibilitychange');
		}
	});

	window.addEventListener('focus', () => {
		requestResumeHeartbeat('focus');
	});

	window.addEventListener('pageshow', () => {
		requestResumeHeartbeat('pageshow');
	});
}

export function registerHeartbeatTransport(): void {
	if (typeof jQuery === 'undefined') {
		return;
	}

	subscribeInitialShipChannel();
	registerResumeHeartbeatTrigger();

	jQuery(document).on('heartbeat-send', (...args: unknown[]) => {
		const data = args[1] as Record<string, unknown>;
		const request = select(
			store
		).getHeartbeatRequest() as BroadcastHeartbeatRequest | null;

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

		lastHeartbeatAt = Date.now();
		dispatch(store).receiveHeartbeat(response);

		log.debug('live.heartbeat.tick', {
			channels: Object.keys(response.channels ?? {}).length,
		});
	});
}
