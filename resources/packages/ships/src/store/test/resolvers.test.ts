import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import { LinkRel } from '@helm/types';
import { getShip, getSystems } from '../resolvers';
import {
	createShipState,
	createSystemComponent,
	createProductEmbed,
} from './fixtures';

vi.mock('@wordpress/api-fetch');

const mockedApiFetch = vi.mocked(apiFetch);

describe('getShip resolver', () => {
	let dispatch: ReturnType<typeof vi.fn> & {
		receiveShipEmbeds: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockedApiFetch.mockReset();
		dispatch = Object.assign(vi.fn(), {
			receiveShipEmbeds: vi.fn(),
		});
	});

	it('dispatches FINISHED on success', async () => {
		const ship = createShipState({ id: 42 });
		mockedApiFetch.mockResolvedValue(ship);

		await getShip(42)({ dispatch } as never);

		expect(dispatch).toHaveBeenCalledWith({
			type: 'FETCH_SHIP_FINISHED',
			ship,
		});
	});

	it('calls apiFetch with embed param', async () => {
		mockedApiFetch.mockResolvedValue(createShipState());

		await getShip(7)({ dispatch } as never);

		expect(mockedApiFetch).toHaveBeenCalledWith({
			path: '/helm/v1/ships/7?_embed[]=helm:systems',
		});
	});

	it('strips _embedded but keeps _links on ship data', async () => {
		const ship = createShipState({ id: 42 });
		const systems = [createSystemComponent()];
		const _links = { self: [{ href: 'http://example.com' }] };
		mockedApiFetch.mockResolvedValue({
			...ship,
			_embedded: { [LinkRel.Systems]: systems },
			_links,
		});

		await getShip(42)({ dispatch } as never);

		expect(dispatch).toHaveBeenCalledWith({
			type: 'FETCH_SHIP_FINISHED',
			ship: { ...ship, _links },
		});
	});

	it('dispatches receiveShipEmbeds when _embedded is present', async () => {
		const embedded = { [LinkRel.Systems]: [createSystemComponent()] };
		mockedApiFetch.mockResolvedValue({
			...createShipState({ id: 42 }),
			_embedded: embedded,
		});

		await getShip(42)({ dispatch } as never);

		expect(dispatch.receiveShipEmbeds).toHaveBeenCalledWith(embedded);
	});

	it('does not dispatch receiveShipEmbeds when no _embedded', async () => {
		mockedApiFetch.mockResolvedValue(createShipState({ id: 42 }));

		await getShip(42)({ dispatch } as never);

		expect(dispatch.receiveShipEmbeds).not.toHaveBeenCalled();
	});

	it('always wraps API error with store-level code', async () => {
		mockedApiFetch.mockRejectedValue({
			code: 'helm.ship.not_found',
			message: 'Ship not found',
			data: { status: 404 },
		});

		await getShip(42)({ dispatch } as never);

		const failedCall = dispatch.mock.calls.find(
			([action]) => action.type === 'FETCH_SHIP_FAILED'
		);
		expect(failedCall).toBeDefined();

		const error = failedCall![0].error;
		expect(error).toBeInstanceOf(HelmError);
		expect(error.message).toBe('helm.ships.invalid_response');
		expect(error.isSafe).toBe(true);
		expect(HelmError.is(error.cause)).toBe(true);
		expect((error.cause as HelmError).message).toBe('helm.ship.not_found');
	});

	it('wraps plain Error as invalid response with cause', async () => {
		mockedApiFetch.mockRejectedValue(new Error('Network failure'));

		await getShip(1)({ dispatch } as never);

		const failedCall = dispatch.mock.calls.find(
			([action]) => action.type === 'FETCH_SHIP_FAILED'
		);

		const error = failedCall![0].error;
		expect(error).toBeInstanceOf(HelmError);
		expect(error.message).toBe('helm.ships.invalid_response');
		expect(error.isSafe).toBe(true);
		expect(HelmError.is(error.cause)).toBe(true);
		expect((error.cause as HelmError).message).toBe('helm.unknown_error');
		expect((error.cause as HelmError).detail).toBe('Network failure');
	});

	it('extracts WP REST error from thrown Response and wraps it', async () => {
		const body = {
			code: 'helm.ship.not_found',
			message: 'Ship not found',
			data: { status: 404 },
		};
		mockedApiFetch.mockRejectedValue(
			new Response(JSON.stringify(body), { status: 404 })
		);

		await getShip(42)({ dispatch } as never);

		const failedCall = dispatch.mock.calls.find(
			([action]) => action.type === 'FETCH_SHIP_FAILED'
		);

		const error = failedCall![0].error;
		expect(error).toBeInstanceOf(HelmError);
		expect(error.message).toBe('helm.ships.invalid_response');
		expect(error.isSafe).toBe(true);
		expect((error.cause as HelmError).message).toBe('helm.ship.not_found');
	});

	it('wraps non-WP-REST Response as invalid response', async () => {
		mockedApiFetch.mockRejectedValue(
			new Response('<html>Error</html>', {
				status: 500,
				statusText: 'Internal Server Error',
			})
		);

		await getShip(42)({ dispatch } as never);

		const failedCall = dispatch.mock.calls.find(
			([action]) => action.type === 'FETCH_SHIP_FAILED'
		);

		const error = failedCall![0].error;
		expect(error).toBeInstanceOf(HelmError);
		expect(error.message).toBe('helm.ships.invalid_response');
		expect(error.isSafe).toBe(true);
		expect(HelmError.is(error.cause)).toBe(true);
		expect((error.cause as HelmError).detail).toBe(
			'HTTP 500 Internal Server Error'
		);
	});
});

describe('getSystems resolver', () => {
	let dispatch: ReturnType<typeof vi.fn>;
	let registry: { dispatch: ReturnType<typeof vi.fn> };
	let productsDispatch: { receiveProducts: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		mockedApiFetch.mockReset();
		dispatch = vi.fn();
		productsDispatch = { receiveProducts: vi.fn() };
		registry = {
			dispatch: vi.fn().mockReturnValue(productsDispatch),
		};
	});

	it('dispatches FINISHED on success', async () => {
		const systems = [createSystemComponent()];
		mockedApiFetch.mockResolvedValue(systems);

		await getSystems(42)({ dispatch, registry } as never);

		expect(dispatch).toHaveBeenCalledWith({
			type: 'FETCH_SYSTEMS_FINISHED',
			systems,
		});
	});

	it('calls apiFetch with the correct path', async () => {
		mockedApiFetch.mockResolvedValue([]);

		await getSystems(7)({ dispatch, registry } as never);

		expect(mockedApiFetch).toHaveBeenCalledWith({
			path: '/helm/v1/ships/7/systems?_embed[]=helm:product',
		});
	});

	it('dispatches product embeds to the products store', async () => {
		const product = createProductEmbed({ id: 10 });
		const systems = [
			{
				...createSystemComponent({ product_id: 10 }),
				_embedded: { [LinkRel.Product]: [product] as [typeof product] },
			},
		];
		mockedApiFetch.mockResolvedValue(systems);

		await getSystems(42)({ dispatch, registry } as never);

		expect(registry.dispatch).toHaveBeenCalledWith(productsStore);
		expect(productsDispatch.receiveProducts).toHaveBeenCalledWith([
			product,
		]);
	});

	it('skips products dispatch when no product embeds', async () => {
		mockedApiFetch.mockResolvedValue([createSystemComponent()]);

		await getSystems(42)({ dispatch, registry } as never);

		expect(registry.dispatch).not.toHaveBeenCalled();
	});

	it('always wraps API error with store-level code', async () => {
		mockedApiFetch.mockRejectedValue({
			code: 'helm.ship.not_found',
			message: 'Ship not found',
			data: { status: 404 },
		});

		await getSystems(42)({ dispatch, registry } as never);

		const failedCall = dispatch.mock.calls.find(
			([action]) => action.type === 'FETCH_SYSTEMS_FAILED'
		);
		expect(failedCall).toBeDefined();

		const error = failedCall![0].error;
		expect(error).toBeInstanceOf(HelmError);
		expect(error.message).toBe('helm.ships.systems_invalid_response');
		expect(error.isSafe).toBe(true);
		expect((error.cause as HelmError).message).toBe('helm.ship.not_found');
	});

	it('wraps plain Error as systems invalid response', async () => {
		mockedApiFetch.mockRejectedValue(new Error('Network failure'));

		await getSystems(1)({ dispatch, registry } as never);

		const failedCall = dispatch.mock.calls.find(
			([action]) => action.type === 'FETCH_SYSTEMS_FAILED'
		);

		const error = failedCall![0].error;
		expect(error).toBeInstanceOf(HelmError);
		expect(error.message).toBe('helm.ships.systems_invalid_response');
		expect(error.isSafe).toBe(true);
		expect(HelmError.is(error.cause)).toBe(true);
	});
});
