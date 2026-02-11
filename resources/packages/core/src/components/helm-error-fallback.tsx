import { ErrorCard, ErrorCompact } from '@helm/ui';
import { formatError } from '../../../errors/src/format-error';
import { HelmError } from '../../../errors/src/helm-error';

/**
 * ErrorBoundary fallback that renders a structured error card.
 */
export function HelmErrorFallback( { error }: { error: unknown } ) {
	const code = HelmError.from( error ).message;
	const { detail, causes } = formatError( error );

	return <ErrorCard code={ code } detail={ detail } causes={ causes } />;
}

/**
 * Compact ErrorBoundary fallback — single-line error display.
 */
export function HelmErrorCompactFallback( { error }: { error: unknown } ) {
	const code = HelmError.from( error ).message;
	const { detail } = formatError( error );

	return <ErrorCompact code={ code } detail={ detail } />;
}
