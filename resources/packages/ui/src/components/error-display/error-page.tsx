import { Icon, error } from '@wordpress/icons';
import { Panel } from '../panel';
import { ErrorContent } from './error-content';
import type { ErrorContentProps } from './error-content';

export type ErrorPageProps = ErrorContentProps;

export function ErrorPage( props: ErrorPageProps ) {
	return (
		<div className="helm-error-page">
			<Panel variant="bordered" tone="danger" className="helm-error-page__panel">
				<div className="helm-error-page__icon">
					<Icon icon={ error } size={ 32 } />
				</div>
				<ErrorContent { ...props } />
			</Panel>
		</div>
	);
}
