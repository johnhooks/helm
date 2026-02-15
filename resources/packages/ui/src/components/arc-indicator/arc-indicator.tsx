import type { CSSProperties } from 'react';
import type { LcarsTone } from '../../tones';

export interface ArcIndicatorProps {
	/**
	 * Level from 0-100
	 */
	level?: number;
	/**
	 * Size variant
	 */
	size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	/**
	 * Surface tone
	 */
	tone?: LcarsTone;
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

export function ArcIndicator({
	level = 60,
	size = 'md',
	tone = 'neutral',
	className = '',
	style,
	'data-testid': testId,
}: ArcIndicatorProps) {
	const clamped = Math.min(100, Math.max(0, level));
	const classNames = [
		'helm-arc-indicator',
		`helm-tone--${tone}`,
		`helm-arc-indicator--${size}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	const indicatorStyle = {
		...style,
		'--helm-arc-level': clamped,
	} as CSSProperties;

	return (
		<span
			className={classNames}
			style={indicatorStyle}
			data-testid={testId}
		/>
	);
}
