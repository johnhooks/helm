import { LcarsModal } from '../lcars-modal';
import { Button } from '../button';
import { ErrorContent } from './error-content';
import type { ErrorContentProps } from './error-content';

export interface ErrorModalProps extends ErrorContentProps {
	/**
	 * Called when the modal is dismissed.
	 */
	onDismiss: () => void;
	/**
	 * Whether the modal is open.
	 */
	isOpen?: boolean;
}

export function ErrorModal( {
	onDismiss,
	isOpen = true,
	...contentProps
}: ErrorModalProps ) {
	return (
		<LcarsModal
			title="Error"
			tone="danger"
			isOpen={ isOpen }
			onRequestClose={ onDismiss }
			footer={
				<Button variant="secondary" onClick={ onDismiss }>
					Dismiss
				</Button>
			}
		>
			<ErrorContent { ...contentProps } />
		</LcarsModal>
	);
}
