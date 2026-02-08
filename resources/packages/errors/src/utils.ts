import type { WpRestErrorResponse } from './types';

/**
 * Check if a value matches the WP REST error response shape.
 */
export function isWpRestErrorResponse(
	value: unknown,
): value is WpRestErrorResponse {
	return (
		typeof value === 'object' &&
		value !== null &&
		'code' in value &&
		typeof (value as WpRestErrorResponse).code === 'string' &&
		'message' in value &&
		typeof (value as WpRestErrorResponse).message === 'string'
	);
}
