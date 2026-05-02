import { __ } from '@wordpress/i18n';
import { LogCard, StatusBadge } from '@helm/ui';
import { ErrorCode, formatError, HelmError } from '@helm/errors';

export function ShipActionErrorFallback({ error }: { error: unknown }) {
	const safeError = HelmError.safeFrom(
		error,
		ErrorCode.ActionsRenderFailed,
		__('Ship log entry unreadable — renderer fault', 'helm')
	);
	const { detail, causes } = formatError(safeError);

	return (
		<LogCard
			time={__('error', 'helm')}
			title={__('Action Renderer Fault', 'helm')}
			tone="danger"
			status={
				<StatusBadge tone="danger" size="sm">
					{__('Fault', 'helm')}
				</StatusBadge>
			}
		>
			{detail && <p>{detail}</p>}
			{causes && causes.length > 0 && (
				<ul>
					{causes.map((cause, index) => (
						<li key={index}>{cause}</li>
					))}
				</ul>
			)}
		</LogCard>
	);
}
