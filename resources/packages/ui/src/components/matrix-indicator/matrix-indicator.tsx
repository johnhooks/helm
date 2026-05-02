import type { CSSProperties } from 'react';
import type { LcarsTone } from '../../tones';

export interface MatrixIndicatorProps {
	/**
	 * Level from 0-100
	 */
	level?: number;
	/**
	 * Matrix rows
	 */
	rows?: number;
	/**
	 * Matrix columns
	 */
	cols?: number;
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

export function MatrixIndicator({
	level = 60,
	rows = 6,
	cols = 4,
	tone = 'neutral',
	className = '',
	style,
	'data-testid': testId,
}: MatrixIndicatorProps) {
	const clamped = Math.min(100, Math.max(0, level));
	const total = rows * cols;
	const filled = Math.round((clamped / 100) * total);
	const cells = Array.from(
		{ length: total },
		(_, index) => index >= total - filled
	);

	const classNames = [
		'helm-matrix-indicator',
		`helm-tone--${tone}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	const matrixStyle = {
		...style,
		'--helm-matrix-rows': rows,
		'--helm-matrix-cols': cols,
	} as CSSProperties;

	return (
		<span className={classNames} style={matrixStyle} data-testid={testId}>
			{cells.map((filledCell, index) => (
				<span
					key={index}
					className={`helm-matrix-indicator__cell ${
						filledCell ? 'helm-matrix-indicator__cell--filled' : ''
					}`}
				/>
			))}
		</span>
	);
}
