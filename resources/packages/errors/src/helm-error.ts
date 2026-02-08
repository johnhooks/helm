import type { HelmErrorOptions } from './types';
import { isWpRestErrorResponse } from './utils';

/**
 * Structured error for the Helm plugin.
 *
 * - `message` (inherited from Error) holds the error **code** (e.g. "helm.ship.not_found")
 *   for stack traces and programmatic matching.
 * - `detail` holds the human-readable, translatable message for display.
 * - `isSafe` indicates whether `detail` is a translatable, user-facing string
 *   safe to render in the UI. Errors from `from()` wrapping unknown throws are
 *   marked unsafe since they may contain technical messages.
 * - `data` preserves the full WP_Error data bag (status, params, etc.).
 * - `causes` holds nested errors from WP_Error's `additional_errors`.
 */
export class HelmError extends Error {
	override readonly message: string;
	readonly detail: string;
	readonly isSafe: boolean;
	readonly data: Record<string, unknown>;
	readonly causes: readonly HelmError[];

	constructor(code: string, detail?: string, options?: HelmErrorOptions) {
		super(code);
		this.name = 'HelmError';
		this.message = code;
		this.detail = detail ?? '';
		this.isSafe = options?.isSafe ?? false;
		this.data = options?.data ?? {};
		this.causes = options?.causes ?? [];
	}

	/** HTTP status extracted from data.status, if present. */
	get status(): number | undefined {
		const s = this.data.status;
		return typeof s === 'number' ? s : undefined;
	}

	/** Convert an unknown thrown value to a HelmError. */
	static from(error: unknown): HelmError {
		if (HelmError.is(error)) return error;

		if (isWpRestErrorResponse(error)) {
			return new HelmError(error.code, error.message, {
				isSafe: true,
				data: error.data ?? {},
				causes: error.additional_errors?.map(
					(e) =>
						new HelmError(e.code, e.message, {
							isSafe: true,
							data: e.data ?? {},
						}),
				),
			});
		}

		const detail =
			error instanceof Error
				? error.message
				: typeof error === 'string'
					? error
					: 'An unknown error occurred';

		return new HelmError('unknown', detail, { isSafe: false });
	}

	/**
	 * Create a safe, user-facing HelmError that wraps an original error as a cause.
	 *
	 * Use this at catch boundaries to replace a technical or unsafe error
	 * with a translatable message suitable for display in the UI.
	 */
	static safe(code: string, detail: string, cause?: unknown): HelmError {
		const causes = cause !== undefined ? [HelmError.from(cause)] : [];
		return new HelmError(code, detail, { isSafe: true, causes });
	}

	/** Type guard for HelmError instances. */
	static is(error: unknown): error is HelmError {
		return error instanceof HelmError;
	}
}
