import type { CSSProperties, ReactNode } from 'react';
import type { LcarsTone } from '../../tones';

export interface PanelProps {
	/**
	 * Panel content
	 */
	children: ReactNode;
	/**
	 * Color tone for accents
	 */
	tone?: LcarsTone;
	/**
	 * Panel variant
	 */
	variant?: 'default' | 'bordered' | 'bracket' | 'inset' | 'dashed';
	/**
	 * Padding size
	 */
	padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
	/**
	 * Additional CSS class names
	 */
	className?: string;
	/**
	 * Inline styles
	 */
	style?: CSSProperties;
	/**
	 * Test ID for testing
	 */
	'data-testid'?: string;
}

export function Panel({
	children,
	tone = 'neutral',
	variant = 'default',
	padding = 'md',
	className = '',
	style,
	'data-testid': testId,
}: PanelProps) {
	const classNames = [
		'helm-panel',
		`helm-panel--${variant}`,
		`helm-tone--${tone}`,
		`helm-panel--padding-${padding}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	if (variant === 'bracket') {
		return (
			<div className={classNames} style={style} data-testid={testId}>
				<div className="helm-panel__bracket-left" />
				<div className="helm-panel__bracket-content">{children}</div>
				<div className="helm-panel__bracket-right" />
			</div>
		);
	}

	return (
		<div className={classNames} style={style} data-testid={testId}>
			{children}
		</div>
	);
}
