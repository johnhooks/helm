import type { ReactNode } from 'react';
import { Modal } from '@wordpress/components';
import { TitleBar } from '../title-bar';
import type { LcarsTone } from '../../tones';

export interface LcarsModalProps {
	/**
	 * Modal title
	 */
	title: string;
	/**
	 * Called when modal should close
	 */
	onRequestClose: () => void;
	/**
	 * Main content
	 */
	children: ReactNode;
	/**
	 * Footer content (typically buttons)
	 */
	footer?: ReactNode;
	/**
	 * Color tone
	 */
	tone?: LcarsTone;
	/**
	 * Size variant
	 */
	size?: 'small' | 'medium' | 'large';
	/**
	 * Whether modal is open
	 */
	isOpen?: boolean;
	/**
	 * Test ID for testing
	 */
	'data-testid'?: string;
}

export function LcarsModal({
	title,
	onRequestClose,
	children,
	footer,
	tone = 'gold',
	size = 'medium',
	isOpen = true,
	'data-testid': testId,
}: LcarsModalProps) {
	if (!isOpen) {
		return null;
	}

	return (
		<Modal
			title={title}
			onRequestClose={onRequestClose}
			className={`helm-lcars-modal helm-tone--${tone} helm-lcars-modal--${size}`}
			overlayClassName="helm-lcars-modal__overlay"
			__experimentalHideHeader
		>
			<div className="helm-lcars-modal__inner" data-testid={testId}>
				<TitleBar title={title} tone={tone}>
					<button
						type="button"
						className="helm-lcars-modal__close"
						onClick={onRequestClose}
						aria-label="Close modal"
					>
						×
					</button>
				</TitleBar>

				<div className="helm-lcars-modal__content">{children}</div>

				{footer && (
					<div className="helm-lcars-modal__footer">{footer}</div>
				)}
			</div>
		</Modal>
	);
}
