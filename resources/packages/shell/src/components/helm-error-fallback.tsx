import { __ } from '@wordpress/i18n';
import { ErrorCard, ErrorPage, ErrorCompact } from '@helm/ui';
import { ErrorCode, formatError, HelmError } from '@helm/core';

/**
 * ErrorBoundary fallback that renders a structured error card.
 */
export function HelmErrorFallback( { error }: { error: unknown } ) {
	const safeError = HelmError.safeFrom( error, ErrorCode.Unknown, __( 'System fault — loss of ship link signal', 'helm' ) );
	const { detail, causes } = formatError( safeError );

	return <ErrorCard code={ safeError.message } detail={ detail } causes={ causes } />;
}

/**
 * ErrorBoundary fallback that renders a full-page centered error display.
 */
export function HelmErrorPageFallback( { error }: { error: unknown } ) {
	const safeError = HelmError.safeFrom( error, ErrorCode.Unknown, __( 'Bridge failed to render — loss of ship link signal', 'helm' ) );
	const { detail, causes } = formatError( safeError );

	return <ErrorPage code={ safeError.message } detail={ detail } causes={ causes } />;
}

/**
 * Compact ErrorBoundary fallback — single-line error display.
 */
export function HelmErrorCompactFallback( { error }: { error: unknown } ) {
	const safeError = HelmError.safeFrom( error, ErrorCode.Unknown, __( 'System fault detected', 'helm' ) );
	const { detail } = formatError( safeError );

	return <ErrorCompact code={ safeError.message } detail={ detail } />;
}
