import { describe, expect, it } from 'vitest';
import {
	getChannelCursor,
	getChannelError,
	getHeartbeatRequest,
	getSubscribedChannels,
} from './selectors';
import type { State } from './types';

const state: State = {
	channels: {
		'private-ship.45': { cursor: 123, error: null },
		'private-ship.99': {
			cursor: null,
			error: {
				code: 'helm.broadcast.channel_forbidden',
				message: 'Forbidden',
			},
		},
	},
};

describe('live selectors', () => {
	it('returns subscribed channels', () => {
		expect(getSubscribedChannels(state)).toEqual([
			'private-ship.45',
			'private-ship.99',
		]);
	});

	it('returns channel cursors and errors', () => {
		expect(getChannelCursor(state, 'private-ship.45')).toBe(123);
		expect(getChannelCursor(state, 'missing')).toBeNull();
		expect(getChannelError(state, 'private-ship.99')?.code).toBe(
			'helm.broadcast.channel_forbidden'
		);
	});

	it('builds heartbeat request from channel cursors', () => {
		expect(getHeartbeatRequest(state)).toEqual({
			channels: {
				'private-ship.45': 123,
				'private-ship.99': null,
			},
		});
	});
});
