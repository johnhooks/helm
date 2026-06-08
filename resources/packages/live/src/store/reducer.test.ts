import { describe, expect, it } from 'vitest';
import { initializeDefaultState, reducer } from './reducer';

describe('live reducer', () => {
	it('initializes channels from helm settings cursors', () => {
		window.helm = {
			...(window.helm ?? {}),
			settings: {
				workerUrl: '',
				debug: false,
				userId: 1,
				shipId: 45,
				liveCursors: { 'private-ship.45': 123 },
			},
		};

		expect(initializeDefaultState()).toEqual({
			channels: {
				'private-ship.45': { cursor: 123, error: null },
			},
		});
	});

	it('subscribes a channel with an initial cursor', () => {
		const state = reducer(
			{ channels: {} },
			{
				type: 'SUBSCRIBE_CHANNEL',
				channel: 'private-ship.45',
				cursor: 123,
			}
		);

		expect(state.channels['private-ship.45']).toEqual({
			cursor: 123,
			error: null,
		});
	});

	it('stores channel errors without dropping cursor', () => {
		const state = reducer(
			{
				channels: {
					'private-ship.45': { cursor: 123, error: null },
				},
			},
			{
				type: 'SET_CHANNEL_ERROR',
				channel: 'private-ship.45',
				error: {
					code: 'helm.broadcast.channel_forbidden',
					message: 'Forbidden',
					data: { status: 403 },
				},
			}
		);

		expect(state.channels['private-ship.45']).toEqual({
			cursor: 123,
			error: {
				code: 'helm.broadcast.channel_forbidden',
				message: 'Forbidden',
				data: { status: 403 },
			},
		});
	});
});
