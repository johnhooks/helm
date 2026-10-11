import { Tooltip as WPTooltip } from '@wordpress/components';
import type { ReactElement } from 'react';

export type TooltipPlacement =
	| 'top'
	| 'top-start'
	| 'top-end'
	| 'bottom'
	| 'bottom-start'
	| 'bottom-end'
	| 'left'
	| 'right';

export interface TooltipProps {
	/**
	 * The anchor for the tooltip. Accepts only one element. It must be a
	 * native element (or a component that forwards its ref and spreads
	 * extra props onto one), and focusable for keyboard users to reach
	 * the tooltip.
	 */
	children: ReactElement;
	/**
	 * The text shown when the anchor is hovered or focused.
	 */
	text?: string;
	/**
	 * Where the tooltip is positioned relative to its anchor.
	 */
	placement?: TooltipPlacement;
	/**
	 * Delay in milliseconds before the tooltip appears.
	 */
	delay?: number;
	/**
	 * Hide the tooltip when the anchor is clicked.
	 */
	hideOnClick?: boolean;
	/**
	 * Additional CSS class names for the tooltip surface.
	 */
	className?: string;
}

/**
 * LCARS-skinned tooltip. Wraps the WordPress Tooltip so consumers depend on
 * this API and class names rather than on `@wordpress/components` directly;
 * the tooltip portals out of the anchor's stacking context, so it is not
 * clipped by `overflow: hidden` ancestors such as cards.
 */
export function Tooltip({
	children,
	text,
	placement = 'top',
	delay = 200,
	hideOnClick = true,
	className,
}: TooltipProps) {
	const classNames = ['helm-tooltip', className].filter(Boolean).join(' ');

	return (
		<WPTooltip
			text={text}
			placement={placement}
			delay={delay}
			hideOnClick={hideOnClick}
			className={classNames}
		>
			{children}
		</WPTooltip>
	);
}
