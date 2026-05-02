import type { CSSProperties, ReactNode } from 'react';

export interface ButtonPanelProps {
	/**
	 * Edge location
	 */
	edge?: 'left' | 'right';
	/**
	 * Layout behavior
	 */
	layout?: 'compact' | 'space' | 'stretch';
	/**
	 * Panel width
	 */
	width?: number | string;
	/**
	 * Button stack
	 */
	children: ReactNode;
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

export function ButtonPanel({
	edge = 'left',
	layout = 'compact',
	width,
	children,
	className = '',
	style,
	'data-testid': testId,
}: ButtonPanelProps) {
	const classNames = [
		'helm-button-panel',
		`helm-button-panel--${edge}`,
		`helm-button-panel--${layout}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	const panelStyle: CSSProperties = {
		...style,
		...(width
			? {
					'--helm-button-panel-width':
						typeof width === 'number' ? `${width}px` : width,
			  }
			: {}),
	} as CSSProperties;

	return (
		<div className={classNames} style={panelStyle} data-testid={testId}>
			{children}
		</div>
	);
}
