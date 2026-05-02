import { __ } from '@wordpress/i18n';
import { HelmError } from './helm-error';

const FALLBACK = __('An unknown error occurred.', 'helm');

/**
 * Convert an unknown thrown value into display-ready message strings.
 *
 * Walks two dimensions:
 * - **Vertical**: native `Error.cause` chain (wrapped errors)
 * - **Horizontal**: `causes` array at each level (WP_Error `additional_errors`)
 *
 * Returns the root detail and a flat array of safe cause messages.
 * Unsafe details are replaced with a generic fallback.
 */
export function formatError(error: unknown): {
	detail: string;
	causes: string[];
} {
	const helmError = HelmError.from(error);
	const detail =
		helmError.isSafe && helmError.detail ? helmError.detail : FALLBACK;
	const causes: string[] = [];
	collectCauses(helmError, causes, 0);
	return { detail, causes };
}

function collectCauses(error: HelmError, out: string[], depth: number): void {
	if (depth >= 10) {
		return;
	}

	// Horizontal: additional_errors at this level
	for (const sibling of error.causes) {
		if (sibling.isSafe && sibling.detail) {
			out.push(sibling.detail);
		}
	}

	// Vertical: Error.cause chain
	if (error.cause !== undefined) {
		const nested = HelmError.from(error.cause);
		if (nested.isSafe && nested.detail) {
			out.push(nested.detail);
		}
		collectCauses(nested, out, depth + 1);
	}
}
