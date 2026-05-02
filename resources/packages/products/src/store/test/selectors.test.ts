import { describe, it, expect } from 'vitest';
import { HelmError } from '@helm/errors';
import {
	getProduct,
	getPreloadedProduct,
	isProductLoading,
	getProductError,
} from '../selectors';
import { createProduct, createState } from './fixtures';

describe('getProduct', () => {
	it('returns the product when it exists', () => {
		const product = createProduct();
		const state = createState({ byId: { 1: product } });

		expect(getProduct(state, 1)).toBe(product);
	});

	it('returns undefined for unknown product', () => {
		const state = createState();

		expect(getProduct(state, 999)).toBeUndefined();
	});
});

describe('getPreloadedProduct', () => {
	it('returns the product when it exists', () => {
		const product = createProduct();
		const state = createState({ byId: { 1: product } });

		expect(getPreloadedProduct(state, 1)).toBe(product);
	});

	it('throws when product is not in store', () => {
		const state = createState();
		let error: HelmError | undefined;

		try {
			getPreloadedProduct(state, 999);
		} catch (e) {
			error = e as HelmError;
		}

		expect(error).toBeInstanceOf(HelmError);
		expect(error?.message).toBe('helm.products.not_preloaded');
	});
});

describe('isProductLoading', () => {
	it('returns true when loading', () => {
		const state = createState({ isLoading: { 1: true } });

		expect(isProductLoading(state, 1)).toBe(true);
	});

	it('returns false when not loading', () => {
		const state = createState({ isLoading: { 1: false } });

		expect(isProductLoading(state, 1)).toBe(false);
	});

	it('returns false for unknown product', () => {
		const state = createState();

		expect(isProductLoading(state, 999)).toBe(false);
	});
});

describe('getProductError', () => {
	it('returns the error when it exists', () => {
		const error = new HelmError('helm.product.not_found', 'Not found');
		const state = createState({ errors: { 1: error } });

		expect(getProductError(state, 1)).toBe(error);
	});

	it('returns undefined when no error', () => {
		const state = createState();

		expect(getProductError(state, 999)).toBeUndefined();
	});
});
