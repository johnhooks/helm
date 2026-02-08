import type { HelmError } from './helm-error';

/** Shape WordPress REST API returns for WP_Error responses. */
export interface WpRestErrorResponse {
	code: string;
	message: string;
	data?: { status?: number; [key: string]: unknown };
	additional_errors?: Array<{
		code: string;
		message: string;
		data?: { status?: number; [key: string]: unknown };
	}>;
}

export interface HelmErrorOptions {
	data?: Record<string, unknown>;
	causes?: HelmError[];
	isSafe?: boolean;
}
