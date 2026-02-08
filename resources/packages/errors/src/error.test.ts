import { describe, it, expect } from 'vitest';
import { ErrorCode } from './error-code';
import { ServerErrorCode } from './server-error-code';
import { HelmError } from './helm-error';
import { isWpRestErrorResponse } from './utils';

describe('ErrorCode', () => {
	it('has client-side datacore codes', () => {
		expect(ErrorCode.DatacoreUnsupported).toBe('helm.datacore.unsupported');
		expect(ErrorCode.DatacoreWorkerError).toBe('helm.datacore.worker_error');
		expect(ErrorCode.DatacoreUnexpectedResponse).toBe('helm.datacore.unexpected_response');
	});

	it('has client-side cache codes', () => {
		expect(ErrorCode.CacheFetchFailed).toBe('helm.cache.fetch_failed');
		expect(ErrorCode.CacheSyncFailed).toBe('helm.cache.sync_failed');
	});

	it('has an Unknown fallback', () => {
		expect(ErrorCode.Unknown).toBe('unknown');
	});

	it('works as HelmError code', () => {
		const err = new HelmError(ErrorCode.DatacoreUnsupported, 'Not supported');
		expect(err.message).toBe('helm.datacore.unsupported');
	});
});

describe('ServerErrorCode', () => {
	it('mirrors PHP error codes with helm. prefix', () => {
		expect(ServerErrorCode.ShipNotFound).toBe('helm.ship.not_found');
		expect(ServerErrorCode.ActionFailed).toBe('helm.action.failed');
		expect(ServerErrorCode.NavigationNoRoute).toBe('helm.navigation.no_route');
	});

	it('can match against HelmError.message from server responses', () => {
		const err = HelmError.from({
			code: 'helm.ship.not_found',
			message: 'Ship not found',
			data: { status: 404 },
		});
		expect(err.message).toBe(ServerErrorCode.ShipNotFound);
	});
});

describe('HelmError', () => {
	it('puts code in .message and human text in .detail', () => {
		const err = new HelmError('helm.ship.not_found', 'Ship not found');

		expect(err.message).toBe('helm.ship.not_found');
		expect(err.detail).toBe('Ship not found');
	});

	it('preserves data bag', () => {
		const err = new HelmError('helm.validation', 'Invalid', {
			data: { status: 400, params: { name: 'Required' } },
		});

		expect(err.data).toEqual({ status: 400, params: { name: 'Required' } });
	});

	it('detail defaults to empty string when omitted', () => {
		const err = new HelmError('helm.datacore.worker_error');

		expect(err.message).toBe('helm.datacore.worker_error');
		expect(err.detail).toBe('');
	});

	it('defaults data to empty object and causes to empty array', () => {
		const err = new HelmError('code', 'msg');

		expect(err.data).toEqual({});
		expect(err.causes).toEqual([]);
	});

	it('defaults isSafe to false', () => {
		const err = new HelmError('code', 'msg');

		expect(err.isSafe).toBe(false);
	});

	it('accepts isSafe override', () => {
		const err = new HelmError('code', 'msg', { isSafe: true });

		expect(err.isSafe).toBe(true);
	});

	it('status getter extracts data.status', () => {
		const err = new HelmError('code', 'msg', {
			data: { status: 404 },
		});

		expect(err.status).toBe(404);
	});

	it('status getter returns undefined when no status', () => {
		const err = new HelmError('code', 'msg');

		expect(err.status).toBeUndefined();
	});

	it('name property is HelmError', () => {
		const err = new HelmError('code', 'msg');

		expect(err.name).toBe('HelmError');
	});

	it('is an instance of Error', () => {
		const err = new HelmError('code', 'msg');

		expect(err).toBeInstanceOf(Error);
	});
});

describe('HelmError.from()', () => {
	it('returns HelmError as-is', () => {
		const original = new HelmError('helm.test', 'test');
		const result = HelmError.from(original);

		expect(result).toBe(original);
	});

	it('converts WP REST error response', () => {
		const wpError = {
			code: 'helm.action.failed',
			message: 'Action failed',
			data: { status: 422 },
		};

		const err = HelmError.from(wpError);

		expect(err.message).toBe('helm.action.failed');
		expect(err.detail).toBe('Action failed');
		expect(err.status).toBe(422);
		expect(err.isSafe).toBe(true);
		expect(err.causes).toEqual([]);
	});

	it('preserves full data bag from WP REST error', () => {
		const wpError = {
			code: 'helm.validation',
			message: 'Validation failed',
			data: { status: 400, params: { name: 'Required' }, details: { field: 'name' } },
		};

		const err = HelmError.from(wpError);

		expect(err.data).toEqual({
			status: 400,
			params: { name: 'Required' },
			details: { field: 'name' },
		});
	});

	it('converts additional_errors to nested causes', () => {
		const wpError = {
			code: 'helm.action.failed',
			message: 'Jump failed',
			data: { status: 422 },
			additional_errors: [
				{
					code: 'helm.navigation.no_route',
					message: 'No known route to target',
					data: { status: 422 },
				},
			],
		};

		const err = HelmError.from(wpError);

		expect(err.causes).toHaveLength(1);
		expect(err.causes[0].message).toBe('helm.navigation.no_route');
		expect(err.causes[0].detail).toBe('No known route to target');
		expect(err.causes[0].data).toEqual({ status: 422 });
	});

	it('wraps plain Error as unknown code and marks unsafe', () => {
		const err = HelmError.from(new Error('Something broke'));

		expect(err.message).toBe('unknown');
		expect(err.detail).toBe('Something broke');
		expect(err.isSafe).toBe(false);
	});

	it('wraps string as unknown code and marks unsafe', () => {
		const err = HelmError.from('Network timeout');

		expect(err.message).toBe('unknown');
		expect(err.detail).toBe('Network timeout');
		expect(err.isSafe).toBe(false);
	});

	it('wraps unexpected values as unknown code and marks unsafe', () => {
		const err = HelmError.from(42);

		expect(err.message).toBe('unknown');
		expect(err.detail).toBe('An unknown error occurred');
		expect(err.isSafe).toBe(false);
	});

	it('handles WP REST error with no data', () => {
		const wpError = {
			code: 'rest_forbidden',
			message: 'Sorry, you are not allowed to do that.',
		};

		const err = HelmError.from(wpError);

		expect(err.message).toBe('rest_forbidden');
		expect(err.detail).toBe('Sorry, you are not allowed to do that.');
		expect(err.data).toEqual({});
		expect(err.status).toBeUndefined();
	});
});

describe('HelmError.safe()', () => {
	it('creates a safe error with isSafe true', () => {
		const err = HelmError.safe('helm.datacore.worker_error', 'A database error occurred.');

		expect(err.message).toBe('helm.datacore.worker_error');
		expect(err.detail).toBe('A database error occurred.');
		expect(err.isSafe).toBe(true);
		expect(err.causes).toEqual([]);
	});

	it('wraps the original error as a cause', () => {
		const original = new Error('SQLITE_CORRUPT: database disk image is malformed');
		const err = HelmError.safe('helm.datacore.worker_error', 'A database error occurred.', original);

		expect(err.isSafe).toBe(true);
		expect(err.causes).toHaveLength(1);
		expect(err.causes[0].message).toBe('unknown');
		expect(err.causes[0].detail).toBe('SQLITE_CORRUPT: database disk image is malformed');
		expect(err.causes[0].isSafe).toBe(false);
	});

	it('wraps a HelmError cause as-is', () => {
		const original = new HelmError('helm.inner', 'Inner error');
		const err = HelmError.safe('helm.outer', 'Outer error', original);

		expect(err.causes).toHaveLength(1);
		expect(err.causes[0]).toBe(original);
	});
});

describe('HelmError.is()', () => {
	it('returns true for HelmError instances', () => {
		expect(HelmError.is(new HelmError('code', 'msg'))).toBe(true);
	});

	it('returns false for plain Error', () => {
		expect(HelmError.is(new Error('msg'))).toBe(false);
	});

	it('returns false for non-errors', () => {
		expect(HelmError.is('string')).toBe(false);
		expect(HelmError.is(null)).toBe(false);
		expect(HelmError.is(undefined)).toBe(false);
	});
});

describe('isWpRestErrorResponse()', () => {
	it('returns true for valid WP REST error shape', () => {
		expect(
			isWpRestErrorResponse({ code: 'test', message: 'msg' }),
		).toBe(true);
	});

	it('returns true with data and additional_errors', () => {
		expect(
			isWpRestErrorResponse({
				code: 'test',
				message: 'msg',
				data: { status: 400 },
				additional_errors: [],
			}),
		).toBe(true);
	});

	it('returns false for non-objects', () => {
		expect(isWpRestErrorResponse('string')).toBe(false);
		expect(isWpRestErrorResponse(null)).toBe(false);
		expect(isWpRestErrorResponse(42)).toBe(false);
	});

	it('returns false when code or message is missing', () => {
		expect(isWpRestErrorResponse({ code: 'test' })).toBe(false);
		expect(isWpRestErrorResponse({ message: 'msg' })).toBe(false);
	});

	it('returns false when code or message is not a string', () => {
		expect(isWpRestErrorResponse({ code: 123, message: 'msg' })).toBe(false);
		expect(isWpRestErrorResponse({ code: 'test', message: 123 })).toBe(false);
	});
});
