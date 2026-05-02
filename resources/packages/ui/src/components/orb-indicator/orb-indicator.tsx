import type { CSSProperties } from 'react';
import type { LcarsTone } from '../../tones';

export interface OrbIndicatorProps {
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

export function OrbIndicator({
	size = 'md',
	tone = 'neutral',
	className = '',
	style,
	'data-testid': testId,
}: OrbIndicatorProps) {
	const classNames = [
		'helm-orb-indicator',
		`helm-tone--${tone}`,
		`helm-orb-indicator--${size}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	return <span className={classNames} style={style} data-testid={testId} />;
}
