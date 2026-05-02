import { Panel } from '../panel';
import { ErrorContent } from './error-content';
import type { ErrorContentProps } from './error-content';

export type ErrorCardProps = ErrorContentProps;

export function ErrorCard(props: ErrorCardProps) {
	return (
		<Panel variant="bordered" tone="danger">
			<ErrorContent {...props} />
		</Panel>
	);
}
