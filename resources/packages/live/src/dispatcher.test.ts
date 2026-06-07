import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchBroadcastEvent, dispatchBroadcastEvents } from './dispatcher';
import type { BroadcastEvent } from './types';

const receiveAction = vi.fn();
const receiveShipState = vi.fn();

vi.mock('@wordpress/data', () => ({
	dispatch: vi.fn((store: { name: string }) => {
		if (store.name === 'actions') {
			return { receiveAction };
		}

		return { receiveShipState };
	}),
}));

vi.mock('@helm/actions', () => ({
	store: { name: 'actions' },
}));

vi.mock('@helm/ships', () => ({
	store: { name: 'ships' },
}));

vi.mock('@helm/core', () => ({
	log: { debug: vi.fn() },
}));

describe('live broadcast dispatcher', () => {
	beforeEach(() => {
		receiveAction.mockClear();
		receiveShipState.mockClear();
	});

	it('dispatches ship action events to the actions store', () => {
		const action = {
			id: 123,
			ship_post_id: 45,
			type: 'survey',
			status: 'running',
			params: {},
			result: null,
			deferred_until: null,
			created_at: '2026-06-07T12:00:00+00:00',
			updated_at: '2026-06-07T12:00:00+00:00',
		} as const;

		dispatchBroadcastEvent({
			id: 1,
			channel: 'private-ship.45',
			type: 'ship.action.updated',
			payload: { action },
		});

		expect(receiveAction).toHaveBeenCalledWith(action);
		expect(receiveShipState).not.toHaveBeenCalled();
	});

	it('dispatches ship state events to the ships store', () => {
		const shipState = {
			id: 45,
			power_mode: 'normal',
			power_full_at: null,
			power_max: 100,
			shields_full_at: null,
			shields_max: 100,
			hull_integrity: 90,
			hull_max: 100,
			node_id: 9,
			current_action_id: 123,
			created_at: '2026-06-07T12:00:00+00:00',
			updated_at: '2026-06-07T12:00:00+00:00',
		};

		dispatchBroadcastEvent({
			id: 2,
			channel: 'private-ship.45',
			type: 'ship.state.updated',
			payload: { ship_state: shipState },
		});

		expect(receiveShipState).toHaveBeenCalledWith(shipState);
		expect(receiveAction).not.toHaveBeenCalled();
	});

	it('dispatches batches in order', () => {
		const events = [
			{
				id: 1,
				channel: 'private-ship.45',
				type: 'ship.action.updated',
				payload: {
					action: {
						id: 123,
						ship_post_id: 45,
						type: 'survey',
						status: 'running',
						params: {},
						result: null,
						deferred_until: null,
						created_at: '2026-06-07T12:00:00+00:00',
						updated_at: '2026-06-07T12:00:00+00:00',
					},
				},
			},
		] as BroadcastEvent[];

		dispatchBroadcastEvents(events);

		expect(receiveAction).toHaveBeenCalledTimes(1);
	});
});
