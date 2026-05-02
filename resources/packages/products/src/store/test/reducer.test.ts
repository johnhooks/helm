import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import { reducer, initializeDefaultState } from '../reducer';
import { createProduct, createState } from './fixtures';

function reduce(
	state = initializeDefaultState(),
	action: Parameters<typeof reducer>[1]
) {
	return reducer(state, action);
}

describe('reducer', () => {
	describe('initializeDefaultState', () => {
		it('returns empty state', () => {
			expect(initializeDefaultState()).toEqual({
				byId: {},
				isLoading: {},
				errors: {},
			});
		});
	});

	describe('FETCH_PRODUCT_START', () => {
		it('sets isLoading for the product', () => {
			const state = reduce(undefined, {
				type: 'FETCH_PRODUCT_START',
				productId: 1,
			});

			expect(state.isLoading[1]).toBe(true);
		});

		it('clears any existing error for the product', () => {
			const prev = createState({
				errors: {
					1: new HelmError('helm.product.not_found', 'Not found'),
				},
			});

			const state = reduce(prev, {
				type: 'FETCH_PRODUCT_START',
				productId: 1,
			});

			expect(state.errors[1]).toBeUndefined();
		});

		it('does not affect other products', () => {
			const product2 = createProduct({ id: 2 });
			const prev = createState({
				byId: { 2: product2 },
				isLoading: { 2: false },
			});

			const state = reduce(prev, {
				type: 'FETCH_PRODUCT_START',
				productId: 1,
			});

			expect(state.byId[2]).toBe(product2);
			expect(state.isLoading[2]).toBe(false);
		});
	});

	describe('FETCH_PRODUCT_FINISHED', () => {
		it('stores the product and clears loading', () => {
			const product = createProduct();
			const prev = createState({ isLoading: { 1: true } });

			const state = reduce(prev, {
				type: 'FETCH_PRODUCT_FINISHED',
				productId: 1,
				product,
			});

			expect(state.byId[1]).toBe(product);
			expect(state.isLoading[1]).toBe(false);
		});

		it('clears any existing error for the product', () => {
			const prev = createState({
				isLoading: { 1: true },
				errors: { 1: new HelmError('helm.test', 'Error') },
			});

			const state = reduce(prev, {
				type: 'FETCH_PRODUCT_FINISHED',
				productId: 1,
				product: createProduct(),
			});

			expect(state.errors[1]).toBeUndefined();
		});

		it('replaces an existing product', () => {
			const original = createProduct({ footprint: 4 });
			const updated = createProduct({ footprint: 6 });
			const prev = createState({ byId: { 1: original } });

			const state = reduce(prev, {
				type: 'FETCH_PRODUCT_FINISHED',
				productId: 1,
				product: updated,
			});

			expect(state.byId[1].footprint).toBe(6);
		});
	});

	describe('FETCH_PRODUCT_FAILED', () => {
		it('stores the error and clears loading', () => {
			const error = new HelmError('helm.product.not_found', 'Not found');
			const prev = createState({ isLoading: { 1: true } });

			const state = reduce(prev, {
				type: 'FETCH_PRODUCT_FAILED',
				productId: 1,
				error,
			});

			expect(state.errors[1]).toBe(error);
			expect(state.isLoading[1]).toBe(false);
		});

		it('does not remove existing product data', () => {
			const product = createProduct();
			const prev = createState({
				byId: { 1: product },
				isLoading: { 1: true },
			});

			const state = reduce(prev, {
				type: 'FETCH_PRODUCT_FAILED',
				productId: 1,
				error: new HelmError('helm.test', 'Error'),
			});

			expect(state.byId[1]).toBe(product);
		});
	});

	describe('RECEIVE_PRODUCT', () => {
		it('stores the product by id', () => {
			const product = createProduct({ id: 5 });

			const state = reduce(undefined, {
				type: 'RECEIVE_PRODUCT',
				product,
			});

			expect(state.byId[5]).toBe(product);
		});

		it('does not touch isLoading or errors', () => {
			const prev = createState({
				isLoading: { 5: true },
				errors: { 5: new HelmError('helm.test', 'Error') },
			});

			const state = reduce(prev, {
				type: 'RECEIVE_PRODUCT',
				product: createProduct({ id: 5 }),
			});

			expect(state.isLoading[5]).toBe(true);
			expect(state.errors[5]).toBeDefined();
		});
	});

	describe('RECEIVE_PRODUCTS', () => {
		it('stores all products by id', () => {
			const products = [
				createProduct({ id: 10 }),
				createProduct({ id: 20 }),
			];

			const state = reduce(undefined, {
				type: 'RECEIVE_PRODUCTS',
				products,
			});

			expect(state.byId[10]).toBe(products[0]);
			expect(state.byId[20]).toBe(products[1]);
		});

		it('merges with existing products', () => {
			const existing = createProduct({ id: 1 });
			const prev = createState({ byId: { 1: existing } });

			const incoming = createProduct({ id: 2 });
			const state = reduce(prev, {
				type: 'RECEIVE_PRODUCTS',
				products: [incoming],
			});

			expect(state.byId[1]).toBe(existing);
			expect(state.byId[2]).toBe(incoming);
		});

		it('handles empty array', () => {
			const prev = initializeDefaultState();
			const state = reduce(prev, {
				type: 'RECEIVE_PRODUCTS',
				products: [],
			});

			expect(state.byId).toEqual({});
		});
	});

	describe('unknown action', () => {
		it('returns the same state', () => {
			const prev = initializeDefaultState();
			const state = reduce(prev, { type: 'UNKNOWN' } as never);

			expect(state).toBe(prev);
		});
	});
});
