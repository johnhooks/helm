import { ErrorCompactContent } from './error-compact-content';
import type { ErrorCompactContentProps } from './error-compact-content';

export type ErrorCompactProps = ErrorCompactContentProps;

export function ErrorCompact( props: ErrorCompactProps ) {
	return (
		<div className="helm-error-compact">
			<ErrorCompactContent { ...props } />
		</div>
	);
}
