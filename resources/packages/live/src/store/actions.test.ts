import { describe, expect, it, vi } from 'vitest';
import { log } from '@helm/core';
import { store as actionsStore } from '@helm/actions';
import { store as shipsStore } from '@helm/ships';
import { receiveHeartbeat } from './actions';

vi.mock('@helm/core', () => ({
	log: {
		warn: vi.fn(),
	},
}));

describe('live actions', () => {
	it('updates cursors and dispatches broadcast events to owning stores', async () => {
		const dispatchAction = Object.assign(vi.fn(), {
			clearChannelError: vi.fn((channel: string) =>
				dispatchAction({ type: 'CLEAR_CHANNEL_ERROR', channel })
			),
			setChannelCursor: vi.fn((channel: string, cursor: number) =>
				dispatchAction({ type: 'SET_CHANNEL_CURSOR', channel, cursor })
			),
			setChannelError: vi.fn((channel: string, error: unknown) =>
				dispatchAction({ type: 'SET_CHANNEL_ERROR', channel, error })
			),
		});
		const receiveActionHeartbeat = vi.fn();
		const receiveShipState = vi.fn();
		const registry = {
			dispatch: vi.fn((store) => {
				if (store === actionsStore) {
					return { receiveHeartbeat: receiveActionHeartbeat };
				}
				if (store === shipsStore) {
					return { receiveShipState };
				}
				throw new Error('Unexpected store');
			}),
		};
		const action = {
			id: 10,
			ship_post_id: 45,
			type: 'survey',
			status: 'running',
			params: {},
			result: null,
			deferred_until: null,
			created_at: '2026-06-07T12:00:00+00:00',
			updated_at: '2026-06-07T12:00:00+00:00',
		} as const;
		const shipState = {
			id: 45,
			power_mode: 'normal',
			power_full_at: null,
			power_max: 100,
			shields_full_at: null,
			shields_max: 100,
			hull_integrity: 100,
			hull_max: 100,
			node_id: 1,
			current_action_id: 10,
			created_at: '2026-06-07T12:00:00+00:00',
			updated_at: '2026-06-07T12:00:00+00:00',
		};

		await receiveHeartbeat({
			channels: {
				'private-ship.45': {
					cursor: 6,
					events: [
						{
							id: 6,
							channel: 'private-ship.45',
							type: 'ship.state.updated',
							payload: { ship_state: shipState },
						},
						{
							id: 5,
							channel: 'private-ship.45',
							type: 'ship.action.updated',
							payload: { action },
							created_at: '2026-06-07T12:00:01+00:00',
						},
					],
				},
			},
		})({ dispatch: dispatchAction, registry } as never);

		expect(dispatchAction).toHaveBeenCalledWith({
			type: 'CLEAR_CHANNEL_ERROR',
			channel: 'private-ship.45',
		});
		expect(dispatchAction).toHaveBeenCalledWith({
			type: 'SET_CHANNEL_CURSOR',
			channel: 'private-ship.45',
			cursor: 6,
		});
		expect(receiveActionHeartbeat).toHaveBeenCalledWith([action]);
		expect(receiveShipState).toHaveBeenCalledWith(shipState);
	});

	it('logs top-level heartbeat errors', async () => {
		const dispatchAction = Object.assign(vi.fn(), {
			clearChannelError: vi.fn(),
			setChannelCursor: vi.fn(),
			setChannelError: vi.fn(),
		});
		const registry = { dispatch: vi.fn() };
		const error = {
			code: 'helm.broadcast.too_many_channels',
			message: 'Too many channels',
			data: { status: 400 },
		};

		await receiveHeartbeat({ channels: {}, error })({
			dispatch: dispatchAction,
			registry,
		} as never);

		expect(log.warn).toHaveBeenCalledWith('live.heartbeat.error', error);
	});
});
