import type { CSSProperties } from 'react';
import type { LcarsTone } from '../../tones';

export interface StackIndicatorProps {
	/**
	 * Level from 0-100
	 */
	level?: number;
	/**
	 * Size variant
	 */
	size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	/**
	 * Number of segments
	 */
	segments?: number;
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

export function StackIndicator({
	level = 60,
	size = 'md',
	segments = 5,
	tone = 'neutral',
	className = '',
	style,
	'data-testid': testId,
}: StackIndicatorProps) {
	const clamped = Math.min(100, Math.max(0, level));
	const filled = Math.round((clamped / 100) * segments);

	const classNames = [
		'helm-stack-indicator',
		`helm-tone--${tone}`,
		`helm-stack-indicator--${size}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<span className={classNames} style={style} data-testid={testId}>
			{Array.from({ length: segments }, (_, index) => (
				<span
					key={index}
					className={`helm-stack-indicator__segment ${
						index >= segments - filled
							? 'helm-stack-indicator__segment--filled'
							: ''
					}`}
				/>
			))}
		</span>
	);
}
