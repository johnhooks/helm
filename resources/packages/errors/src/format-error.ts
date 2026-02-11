import { __ } from '@wordpress/i18n';
import { HelmError } from './helm-error';

/**
 * Convert an unknown thrown value into display-ready message strings.
 *
 * Returns the root detail and an array of safe cause messages.
 * Unsafe details are replaced with a generic fallback.
 */
export function formatError( error: unknown ): { detail: string; causes: string[] } {
	const helmError = HelmError.from( error );

	return {
		detail: helmError.isSafe && helmError.detail
			? helmError.detail
			: __( 'An unknown error occurred.', 'helm' ),
		causes: helmError.causes
			.filter( ( c ) => c.isSafe && c.detail !== '' )
			.map( ( c ) => c.detail ),
	};
}
