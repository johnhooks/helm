import type { CSSProperties } from 'react';
import Select, {
	type Props as ReactSelectProps,
	type GroupBase,
	type StylesConfig,
} from 'react-select';
import type { LcarsTone } from '../../tones';

export interface SelectOption {
	value: string;
	label: string;
}

export interface SelectControlProps<
	Option = SelectOption,
	IsMulti extends boolean = false,
	Group extends GroupBase<Option> = GroupBase<Option>,
> extends Omit<ReactSelectProps<Option, IsMulti, Group>, 'styles' | 'theme'> {
	/**
	 * Surface tone
	 */
	surface?: 'neutral' | 'base' | 'accent' | 'muted';
	/**
	 * Primary color tone for selected option highlighting
	 */
	tone?: LcarsTone;
	/**
	 * Size variant
	 */
	size?: 'sm' | 'md';
	/**
	 * Additional CSS class names
	 */
	className?: string;
	/**
	 * Inline styles for the container
	 */
	style?: CSSProperties;
	/**
	 * Test ID for testing
	 */
	'data-testid'?: string;
}

export function SelectControl<
	Option = SelectOption,
	IsMulti extends boolean = false,
	Group extends GroupBase<Option> = GroupBase<Option>,
>({
	surface = 'neutral',
	tone = 'neutral',
	size = 'md',
	className = '',
	style,
	'data-testid': testId,
	...props
}: SelectControlProps<Option, IsMulti, Group>) {
	const classNames = [
		'helm-select',
		`helm-surface--${surface}`,
		`helm-tone--${tone}`,
		`helm-select--${size}`,
		className,
	]
		.filter(Boolean)
		.join(' ');

	/*
	 * Helm tone/surface → react-select style mapping
	 *
	 * react-select doesn't use CSS classes for internal elements — it requires a
	 * `styles` config object with per-part style functions. We bridge the Helm
	 * design system into that API here:
	 *
	 *   --helm-surface-*  → control chrome (bg, border, fg)
	 *   --helm-tone        → focus ring, selected-option background
	 *   --helm-tone-fg     → selected-option foreground text
	 *   --helm-ui-*        → menu/dropdown (these sit outside the surface context)
	 *
	 * Because react-select resolves CSS variables at style-application time, all
	 * Helm token references work — including dynamic tone classes set on the
	 * wrapper div above.
	 */
	const customStyles: StylesConfig<Option, IsMulti, Group> = {
		control: (base, state) => ({
			...base,
			background: 'var(--helm-surface-bg)',
			borderColor: state.isFocused
				? 'var(--helm-tone)'
				: 'var(--helm-surface-border)',
			borderRadius: 'var(--helm-ui-radius-md)',
			borderWidth: '1px',
			boxShadow: state.isFocused ? '0 0 0 1px var(--helm-tone)' : 'none',
			minHeight: size === 'sm' ? '32px' : '36px',
			cursor: 'pointer',
			'&:hover': {
				borderColor: 'var(--helm-surface-border)',
				background: 'var(--helm-surface-bg-hover)',
			},
		}),
		valueContainer: (base) => ({
			...base,
			padding: size === 'sm' ? '0 10px' : '0 12px',
		}),
		singleValue: (base) => ({
			...base,
			color: 'var(--helm-surface-fg)',
			fontFamily: 'var(--helm-ui-font-family)',
			fontSize: size === 'sm' ? '12px' : '13px',
			fontWeight: 700,
			letterSpacing: '0.04em',
			textTransform: 'uppercase',
			margin: 0,
		}),
		placeholder: (base) => ({
			...base,
			color: 'var(--helm-surface-fg-muted)',
			fontFamily: 'var(--helm-ui-font-family)',
			fontSize: size === 'sm' ? '12px' : '13px',
			fontWeight: 700,
			letterSpacing: '0.04em',
			textTransform: 'uppercase',
		}),
		input: (base) => ({
			...base,
			color: 'var(--helm-surface-fg)',
			fontFamily: 'var(--helm-ui-font-family)',
			fontSize: size === 'sm' ? '12px' : '13px',
			fontWeight: 700,
			letterSpacing: '0.04em',
			textTransform: 'uppercase',
			margin: 0,
			padding: 0,
		}),
		indicatorSeparator: () => ({
			display: 'none',
		}),
		dropdownIndicator: (base, state) => ({
			...base,
			color: 'var(--helm-surface-fg)',
			padding: size === 'sm' ? '6px' : '8px',
			transition: 'transform 160ms ease',
			transform: state.selectProps.menuIsOpen
				? 'rotate(180deg)'
				: undefined,
			'&:hover': {
				color: 'var(--helm-surface-fg)',
			},
		}),
		clearIndicator: (base) => ({
			...base,
			color: 'var(--helm-surface-fg-muted)',
			padding: size === 'sm' ? '6px' : '8px',
			'&:hover': {
				color: 'var(--helm-ui-color-danger)',
			},
		}),
		menu: (base) => ({
			...base,
			background: 'var(--helm-ui-color-surface)',
			border: '1px solid var(--helm-ui-color-border)',
			borderRadius: 'var(--helm-ui-radius-md)',
			boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
			marginTop: '4px',
			overflow: 'hidden',
			zIndex: 100,
		}),
		menuList: (base) => ({
			...base,
			padding: '4px',
		}),
		option: (base, state) => ({
			...base,
			// eslint-disable-next-line no-nested-ternary
			background: state.isSelected
				? 'var(--helm-tone)'
				: state.isFocused
				? 'var(--helm-ui-color-surface-2)'
				: 'transparent',
			color: state.isSelected
				? 'var(--helm-tone-fg)'
				: 'var(--helm-ui-color-text)',
			fontFamily: 'var(--helm-ui-font-family)',
			fontSize: size === 'sm' ? '12px' : '13px',
			fontWeight: 700,
			letterSpacing: '0.04em',
			textTransform: 'uppercase',
			borderRadius: '8px',
			padding: size === 'sm' ? '8px 10px' : '10px 12px',
			cursor: 'pointer',
			'&:active': {
				background: state.isSelected
					? 'var(--helm-tone)'
					: 'var(--helm-ui-color-surface-2)',
			},
		}),
		noOptionsMessage: (base) => ({
			...base,
			color: 'var(--helm-surface-fg-muted)',
			fontFamily: 'var(--helm-ui-font-family)',
			fontSize: size === 'sm' ? '12px' : '13px',
			fontWeight: 700,
			letterSpacing: '0.04em',
			textTransform: 'uppercase',
		}),
		multiValue: (base) => ({
			...base,
			background: 'var(--helm-ui-color-surface-2)',
			borderRadius: '6px',
		}),
		multiValueLabel: (base) => ({
			...base,
			color: 'var(--helm-ui-color-text)',
			fontFamily: 'var(--helm-ui-font-family)',
			fontSize: size === 'sm' ? '11px' : '12px',
			fontWeight: 700,
			letterSpacing: '0.04em',
			textTransform: 'uppercase',
			padding: '2px 6px',
		}),
		multiValueRemove: (base) => ({
			...base,
			color: 'var(--helm-ui-color-muted)',
			borderRadius: '0 6px 6px 0',
			'&:hover': {
				background: 'var(--helm-ui-color-danger)',
				color: '#fff',
			},
		}),
	};

	return (
		<div className={classNames} style={style} data-testid={testId}>
			<Select<Option, IsMulti, Group>
				styles={customStyles}
				classNamePrefix="helm-select"
				{...props}
			/>
		</div>
	);
}
