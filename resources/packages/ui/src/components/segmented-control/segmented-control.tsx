import type { CSSProperties } from 'react';
import type { LcarsTone } from '../../tones';

export interface SegmentedOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface SegmentedControlProps {
	/**
	 * Available options
	 */
	options: SegmentedOption[];
	/**
	 * Currently selected value
	 */
	value?: string;
	/**
	 * Default value for uncontrolled usage
	 */
	defaultValue?: string;
	/**
	 * Change handler
	 */
	onChange?: (value: string) => void;
	/**
	 * Input name for forms (also used for radio group)
	 */
	name?: string;
	/**
	 * Color tone for active segment
	 */
	tone?: LcarsTone;
	/**
	 * Size variant
	 */
	size?: 'sm' | 'md';
	/**
	 * Whether entire control is disabled
	 */
	disabled?: boolean;
	/**
	 * Full width (segments expand equally)
	 */
	fullWidth?: boolean;
	/**
	 * Layout orientation
	 */
	orientation?: 'horizontal' | 'vertical';
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
	/**
	 * Accessible label for the group
	 */
	'aria-label'?: string;
}

let idCounter = 0;

export function SegmentedControl({
	options,
	value,
	defaultValue,
	onChange,
	name,
	tone = 'neutral',
	size = 'md',
	disabled = false,
	fullWidth = false,
	orientation = 'horizontal',
	className = '',
	style,
	'data-testid': testId,
	'aria-label': ariaLabel,
}: SegmentedControlProps) {
	const groupName = name || `segmented-${++idCounter}`;

	const classNames = [
		'helm-segmented',
		`helm-tone--${tone}`,
		'helm-surface--toned',
		`helm-segmented--${size}`,
		disabled && 'helm-segmented--disabled',
		fullWidth && 'helm-segmented--full',
		orientation === 'vertical' && 'helm-segmented--vertical',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const handleChange = (optionValue: string) => {
		if (!disabled && onChange) {
			onChange(optionValue);
		}
	};

	return (
		<div
			className={classNames}
			style={style}
			data-testid={testId}
			role="radiogroup"
			aria-label={ariaLabel}
		>
			{options.map((option, index) => {
				const isChecked =
					value !== undefined ? value === option.value : undefined;
				const isDisabled = disabled || option.disabled;

				return (
					<label
						key={option.value}
						className={[
							'helm-segmented__option',
							index === 0 && 'helm-segmented__option--first',
							index === options.length - 1 &&
								'helm-segmented__option--last',
							isDisabled && 'helm-segmented__option--disabled',
						]
							.filter(Boolean)
							.join(' ')}
					>
						<input
							type="radio"
							className="helm-segmented__input"
							name={groupName}
							value={option.value}
							checked={isChecked}
							defaultChecked={
								value === undefined
									? defaultValue === option.value
									: undefined
							}
							onChange={() => handleChange(option.value)}
							disabled={isDisabled}
						/>
						<span className="helm-segmented__label">
							{option.label}
						</span>
					</label>
				);
			})}
		</div>
	);
}
