import { __ } from '@wordpress/i18n';
import { ErrorCard, ErrorPage, ErrorCompact } from '@helm/ui';
import { ErrorCode, formatError, HelmError, log } from '@helm/core';

function serializeError(error: unknown): Record<string, unknown> {
	if (HelmError.is(error)) {
		return {
			code: error.message,
			detail: error.detail,
			data: error.data,
			cause: serializeError(error.cause),
		};
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
		};
	}

	return { error };
}

function logBoundaryError(error: unknown, fallback: string): void {
	log.error('shell.error_boundary', {
		fallback,
		...serializeError(error),
	});
}

/**
 * ErrorBoundary fallback that renders a structured error card.
 */
export function HelmErrorFallback({ error }: { error: unknown }) {
	const safeError = HelmError.safeFrom(
		error,
		ErrorCode.Unknown,
		__('System fault — loss of ship link signal', 'helm')
	);
	logBoundaryError(safeError, 'card');
	const { detail, causes } = formatError(safeError);

	return (
		<ErrorCard code={safeError.message} detail={detail} causes={causes} />
	);
}

/**
 * ErrorBoundary fallback that renders a full-page centered error display.
 */
export function HelmErrorPageFallback({ error }: { error: unknown }) {
	const safeError = HelmError.safeFrom(
		error,
		ErrorCode.Unknown,
		__('Bridge failed to render — loss of ship link signal', 'helm')
	);
	logBoundaryError(safeError, 'page');
	const { detail, causes } = formatError(safeError);

	return (
		<ErrorPage code={safeError.message} detail={detail} causes={causes} />
	);
}

/**
 * Compact ErrorBoundary fallback — single-line error display.
 */
export function HelmErrorCompactFallback({ error }: { error: unknown }) {
	const safeError = HelmError.safeFrom(
		error,
		ErrorCode.Unknown,
		__('System fault detected', 'helm')
	);
	logBoundaryError(safeError, 'compact');
	const { detail } = formatError(safeError);

	return <ErrorCompact code={safeError.message} detail={detail} />;
}
