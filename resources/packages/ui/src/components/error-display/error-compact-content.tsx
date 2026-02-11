import { StatusBadge } from '../status-badge';

export interface ErrorCompactContentProps {
	/**
	 * Error code (displayed as a danger badge).
	 */
	code: string;
	/**
	 * Human-readable error detail.
	 */
	detail?: string;
}

export function ErrorCompactContent( {
	code,
	detail,
}: ErrorCompactContentProps ) {
	return (
		<>
			<StatusBadge tone="danger" size="sm">{ code }</StatusBadge>
			{ detail && (
				<span className="helm-error-compact__detail">{ detail }</span>
			) }
		</>
	);
}
