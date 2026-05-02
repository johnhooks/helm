import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { HelmError } from '@helm/errors';
import { getActions, getAction } from '../resolvers';
import { createShipAction } from './fixtures';

vi.mock('@wordpress/api-fetch');

const mockedApiFetch = vi.mocked(apiFetch);

describe('getActions resolver', () => {
	let dispatch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockedApiFetch.mockReset();
		dispatch = vi.fn();
	});

	it('dispatches START then FINISHED on success', async () => {
		const actions = [createShipAction({ id: 10 })];
		const response = new Response(JSON.stringify(actions), {
			headers: { Link: '' },
		});
		mockedApiFetch.mockResolvedValue(response);

		await getActions(1)({ dispatch } as never);

		expect(dispatch).toHaveBeenCalledTimes(2);
		expect(dispatch).toHaveBeenNthCalledWith(1, {
			type: 'FETCH_ACTIONS_START',
			queryId: '/helm/v1/ships/1/actions',
		});
		expect(dispatch).toHaveBeenNthCalledWith(2, {
			type: 'FETCH_ACTIONS_FINISHED',
			queryId: '/helm/v1/ships/1/actions',
			actions,
			next: null,
		});
	});

	it('parses Link header for next URL', async () => {
		const actions = [createShipAction({ id: 10 })];
		const response = new Response(JSON.stringify(actions), {
			headers: { Link: '<http://example.com/next>; rel="next"' },
		});
		mockedApiFetch.mockResolvedValue(response);

		await getActions(1)({ dispatch } as never);

		expect(dispatch).toHaveBeenCalledTimes(2);
		expect(dispatch.mock.calls[1][0].type).toBe('FETCH_ACTIONS_FINISHED');
		expect(dispatch.mock.calls[1][0].next).toBe('http://example.com/next');
	});

	it('dispatches FAILED on error', async () => {
		mockedApiFetch.mockRejectedValue(new Error('Network failure'));

		await getActions(1)({ dispatch } as never);

		expect(dispatch).toHaveBeenCalledTimes(2);
		expect(dispatch).toHaveBeenNthCalledWith(1, {
			type: 'FETCH_ACTIONS_START',
			queryId: '/helm/v1/ships/1/actions',
		});
		expect(dispatch.mock.calls[1][0].type).toBe('FETCH_ACTIONS_FAILED');
		expect(dispatch.mock.calls[1][0].error).toBeInstanceOf(HelmError);
		expect(dispatch.mock.calls[1][0].queryId).toBe(
			'/helm/v1/ships/1/actions'
		);
	});
});

describe('getAction resolver', () => {
	let dispatch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockedApiFetch.mockReset();
		dispatch = vi.fn();
	});

	it('dispatches START then FINISHED on success', async () => {
		const updated = createShipAction({
			id: 42,
			ship_post_id: 5,
			status: 'fulfilled',
		});
		mockedApiFetch.mockResolvedValue(updated);

		await getAction(42)({ dispatch } as never);

		expect(dispatch).toHaveBeenCalledTimes(2);
		expect(dispatch).toHaveBeenNthCalledWith(1, {
			type: 'FETCH_ACTION_START',
			actionId: 42,
		});
		expect(dispatch).toHaveBeenNthCalledWith(2, {
			type: 'FETCH_ACTION_FINISHED',
			action: updated,
		});
	});

	it('calls apiFetch with the correct path', async () => {
		mockedApiFetch.mockResolvedValue(
			createShipAction({ id: 10, ship_post_id: 3 })
		);

		await getAction(10)({ dispatch } as never);

		expect(mockedApiFetch).toHaveBeenCalledWith({
			path: '/helm/v1/actions/10',
		});
	});

	it('dispatches FAILED on error', async () => {
		mockedApiFetch.mockRejectedValue(new Error('Network failure'));

		await getAction(42)({ dispatch } as never);

		expect(dispatch).toHaveBeenCalledTimes(2);
		expect(dispatch).toHaveBeenNthCalledWith(1, {
			type: 'FETCH_ACTION_START',
			actionId: 42,
		});
		expect(dispatch.mock.calls[1][0].type).toBe('FETCH_ACTION_FAILED');
		expect(dispatch.mock.calls[1][0].actionId).toBe(42);
		expect(dispatch.mock.calls[1][0].error).toBeInstanceOf(HelmError);
	});
});
