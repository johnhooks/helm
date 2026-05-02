import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiFetch from '@wordpress/api-fetch';
import { HelmError } from '@helm/errors';
import { store as productsStore } from '@helm/products';
import { LinkRel } from '@helm/types';
import {
	receiveShip,
	receiveSystems,
	editShip,
	patchShip,
	receiveShipEmbeds,
} from '../actions';
import {
	createShipState,
	createSystemComponent,
	createProductEmbed,
} from './fixtures';

vi.mock('@wordpress/api-fetch');

const mockedApiFetch = vi.mocked(apiFetch);

describe('receiveShip', () => {
	it('returns a RECEIVE_SHIP action', () => {
		const ship = createShipState({ id: 5 });
		const action = receiveShip(ship);

		expect(action).toEqual({
			type: 'RECEIVE_SHIP',
			ship,
		});
	});
});

describe('receiveSystems', () => {
	it('returns a RECEIVE_SYSTEMS action', () => {
		const systems = [createSystemComponent()];
		const action = receiveSystems(systems);

		expect(action).toEqual({
			type: 'RECEIVE_SYSTEMS',
			systems,
		});
	});
});

describe('editShip', () => {
	it('returns an EDIT_SHIP action', () => {
		const edits = { power_mode: 'overdrive' };
		const action = editShip(edits);

		expect(action).toEqual({
			type: 'EDIT_SHIP',
			edits,
		});
	});
});

describe('receiveShipEmbeds', () => {
	let dispatch: ReturnType<typeof vi.fn>;
	let registry: { dispatch: ReturnType<typeof vi.fn> };
	let productsDispatch: { receiveProducts: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		dispatch = vi.fn();
		productsDispatch = { receiveProducts: vi.fn() };
		registry = {
			dispatch: vi.fn().mockReturnValue(productsDispatch),
		};
	});

	it('dispatches receiveSystems when helm:systems is present', () => {
		const systems = [createSystemComponent()];

		receiveShipEmbeds({ [LinkRel.Systems]: systems })({
			dispatch,
			registry,
		} as never);

		expect(dispatch).toHaveBeenCalledWith({
			type: 'RECEIVE_SYSTEMS',
			systems,
		});
	});

	it('dispatches product embeds to the products store', () => {
		const product = createProductEmbed({ id: 10 });
		const systems = [
			{
				...createSystemComponent({ product_id: 10 }),
				_embedded: { [LinkRel.Product]: [product] as [typeof product] },
			},
		];

		receiveShipEmbeds({ [LinkRel.Systems]: systems })({
			dispatch,
			registry,
		} as never);

		expect(registry.dispatch).toHaveBeenCalledWith(productsStore);
		expect(productsDispatch.receiveProducts).toHaveBeenCalledWith([
			product,
		]);
	});

	it('skips products dispatch when no product embeds', () => {
		const systems = [createSystemComponent()];

		receiveShipEmbeds({ [LinkRel.Systems]: systems })({
			dispatch,
			registry,
		} as never);

		expect(registry.dispatch).not.toHaveBeenCalled();
	});

	it('does not dispatch when helm:systems is absent', () => {
		receiveShipEmbeds({})({ dispatch, registry } as never);

		expect(dispatch).not.toHaveBeenCalled();
		expect(registry.dispatch).not.toHaveBeenCalled();
	});
});

describe('patchShip', () => {
	let dispatch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockedApiFetch.mockReset();
		dispatch = vi.fn();
	});

	it('dispatches PATCH_SHIP_START with edits, then FINISHED on success', async () => {
		const ship = createShipState({ id: 42, power_mode: 'overdrive' });
		mockedApiFetch.mockResolvedValue(ship);

		await patchShip(42, { power_mode: 'overdrive' })({ dispatch } as never);

		expect(dispatch).toHaveBeenCalledWith({
			type: 'PATCH_SHIP_START',
			edits: { power_mode: 'overdrive' },
		});
		expect(dispatch).toHaveBeenCalledWith({
			type: 'PATCH_SHIP_FINISHED',
			ship,
		});
	});

	it('returns null on success', async () => {
		mockedApiFetch.mockResolvedValue(createShipState());

		const result = await patchShip(1, { power_mode: 'normal' })({
			dispatch,
		} as never);

		expect(result).toBeNull();
	});

	it('calls apiFetch with PATCH method and edits body', async () => {
		mockedApiFetch.mockResolvedValue(createShipState());

		await patchShip(7, { power_mode: 'efficiency' })({ dispatch } as never);

		expect(mockedApiFetch).toHaveBeenCalledWith({
			path: '/helm/v1/ships/7',
			method: 'PATCH',
			data: { power_mode: 'efficiency' },
		});
	});

	it('always wraps API error with store-level code', async () => {
		mockedApiFetch.mockRejectedValue({
			code: 'helm.ship.invalid_power_mode',
			message: 'Invalid power mode',
			data: { status: 422 },
		});

		await patchShip(42, { power_mode: 'bad' })({ dispatch } as never);

		const failedCall = dispatch.mock.calls.find(
			([action]) => action.type === 'PATCH_SHIP_FAILED'
		);
		expect(failedCall).toBeDefined();

		const error = failedCall![0].error;
		expect(error).toBeInstanceOf(HelmError);
		expect(error.message).toBe('helm.ships.patch_failed');
		expect(error.isSafe).toBe(true);
		expect((error.cause as HelmError).message).toBe(
			'helm.ship.invalid_power_mode'
		);
	});

	it('returns the HelmError on failure', async () => {
		mockedApiFetch.mockRejectedValue({
			code: 'helm.ship.invalid_power_mode',
			message: 'Invalid power mode',
			data: { status: 422 },
		});

		const result = await patchShip(42, { power_mode: 'bad' })({
			dispatch,
		} as never);

		expect(result).toBeInstanceOf(HelmError);
		expect(result?.message).toBe('helm.ships.patch_failed');
	});

	it('wraps plain Error as patch failed with cause', async () => {
		mockedApiFetch.mockRejectedValue(new Error('Network failure'));

		await patchShip(1, { power_mode: 'normal' })({ dispatch } as never);

		const failedCall = dispatch.mock.calls.find(
			([action]) => action.type === 'PATCH_SHIP_FAILED'
		);

		const error = failedCall![0].error;
		expect(error).toBeInstanceOf(HelmError);
		expect(error.message).toBe('helm.ships.patch_failed');
		expect(error.isSafe).toBe(true);
		expect(HelmError.is(error.cause)).toBe(true);
	});
});
