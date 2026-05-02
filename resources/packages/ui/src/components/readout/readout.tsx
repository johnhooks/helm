import type { CSSProperties, ReactNode } from 'react';
import type { LcarsTone } from '../../tones';

export interface ReadoutProps {
	/**
	 * Readout label
	 */
	label: string;
	/**
	 * Primary value to display
	 */
	value: ReactNode;
	/**
	 * Optional max value (displayed smaller and muted)
	 */
	max?: ReactNode;
	/**
	 * Unit label
	 */
	unit?: string;
	/**
	 * Color tone
	 */
	tone?: LcarsTone;
	/**
	 * Size variant
	 */
	size?: 'sm' | 'md' | 'lg';
	/**
	 * Maximum decimal places when value is a number. Trailing zeros are trimmed.
	 */
	precision?: number;
	/**
	 * Text alignment
	 */
	align?: 'left' | 'center' | 'right';
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

export function Readout({
	label,
	value,
	max,
	unit,
	tone = 'neutral',
	size = 'md',
	align = 'left',
	precision = 2,
	className = '',
	style,
	'data-testid': testId,
}: ReadoutProps) {
	const displayValue = formatValue(value, precision);
	const displayMax = formatValue(max, precision);
	const classNames = [
		'helm-readout',
		`helm-readout--${size}`,
		`helm-readout--${align}`,
		`helm-tone--${tone}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<dl className={classNames} style={style} data-testid={testId}>
			<dt className="helm-readout__label-row">
				<span className="helm-readout__label">{label}</span>
				{unit && <span className="helm-readout__unit">{unit}</span>}
			</dt>
			<dd className="helm-readout__value-row">
				<span className="helm-readout__value">{displayValue}</span>
				{max !== undefined && (
					<span className="helm-readout__max">/{displayMax}</span>
				)}
			</dd>
		</dl>
	);
}

function formatValue(value: ReactNode, precision: number): ReactNode {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return value;
	}
	return Number(value.toFixed(precision));
}
