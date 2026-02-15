import type { CSSProperties } from 'react';
import type { LcarsTone } from '../../tones';

export interface BarIndicatorProps {
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

export function BarIndicator({
	level = 60,
	size = 'md',
	tone = 'neutral',
	className = '',
	style,
	'data-testid': testId,
}: BarIndicatorProps) {
	const clamped = Math.min(100, Math.max(0, level));
	const classNames = [
		'helm-bar-indicator',
		`helm-tone--${tone}`,
		`helm-bar-indicator--${size}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	const indicatorStyle = {
		...style,
		'--helm-bar-level': `${clamped}%`,
	} as CSSProperties;

	return (
		<span
			className={classNames}
			style={indicatorStyle}
			data-testid={testId}
		/>
	);
}
