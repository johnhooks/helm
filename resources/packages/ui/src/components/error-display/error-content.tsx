import { StatusBadge } from '../status-badge';

export interface ErrorContentProps {
	/**
	 * Error code (displayed as a danger badge).
	 */
	code: string;
	/**
	 * Human-readable error detail.
	 */
	detail?: string;
	/**
	 * Human-readable cause messages.
	 */
	causes?: string[];
}

export function ErrorContent( {
	code,
	detail,
	causes,
}: ErrorContentProps ) {
	return (
		<div className="helm-error-content">
			<StatusBadge tone="danger">{ code }</StatusBadge>
			{ detail && (
				<p className="helm-error-content__detail">{ detail }</p>
			) }
			{ causes && causes.length > 0 && (
				<ul className="helm-error-causes">
					{ causes.map( ( cause, i ) => (
						<li key={ i }>{ cause }</li>
					) ) }
				</ul>
			) }
		</div>
	);
}
