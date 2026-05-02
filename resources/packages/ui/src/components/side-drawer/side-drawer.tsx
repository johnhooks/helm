import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useInstanceId } from '@wordpress/compose';
import { Icon, chevronLeft, chevronRight } from '@wordpress/icons';
import './side-drawer.css';

export interface SideDrawerProps {
	/**
	 * Content rendered in the main viewport area (left).
	 */
	viewport: ReactNode;
	/**
	 * Content rendered inside the drawer (right).
	 */
	children: ReactNode;
	/**
	 * Whether the drawer is open.
	 */
	open?: boolean;
	/**
	 * Called when the toggle is clicked.
	 */
	onToggle?: () => void;
	/**
	 * Drawer width in pixels. Defaults to 380.
	 */
	width?: number;
	/**
	 * Animation duration in ms. Defaults to 250.
	 */
	duration?: number;
	/**
	 * Additional CSS class names.
	 */
	className?: string;
	/**
	 * Inline styles applied to the root element.
	 */
	style?: CSSProperties;
	/**
	 * Test ID for testing.
	 */
	'data-testid'?: string;
}

/**
 * Ease-out quadratic: decelerates toward the end.
 */
function easeOut(t: number): number {
	return t * (2 - t);
}

export function SideDrawer({
	viewport,
	children,
	open = true,
	onToggle,
	width = 380,
	duration = 250,
	className,
	style,
	'data-testid': testId,
}: SideDrawerProps) {
	const panelId = useInstanceId(
		SideDrawer,
		'helm-side-drawer-panel'
	) as string;
	const wrapperRef = useRef<HTMLDivElement>(null);
	const animRef = useRef<number | null>(null);
	const isFirstRender = useRef(true);

	// Animate wrapper width via rAF.
	const animate = useCallback(
		(from: number, to: number) => {
			if (animRef.current !== null) {
				cancelAnimationFrame(animRef.current);
			}

			const wrapper = wrapperRef.current;
			if (!wrapper) {
				return;
			}

			const start = performance.now();

			function step(now: number) {
				const t = Math.min((now - start) / duration, 1);
				const current = from + (to - from) * easeOut(t);
				wrapper!.style.width = `${current}px`;

				if (t < 1) {
					animRef.current = requestAnimationFrame(step);
				} else {
					animRef.current = null;
				}
			}

			animRef.current = requestAnimationFrame(step);
		},
		[duration]
	);

	useEffect(() => {
		// Set initial width without animation on first render.
		if (isFirstRender.current) {
			isFirstRender.current = false;
			if (wrapperRef.current) {
				wrapperRef.current.style.width = open ? `${width}px` : '0px';
			}
			return;
		}

		const from = open ? 0 : width;
		const to = open ? width : 0;
		animate(from, to);

		return () => {
			if (animRef.current !== null) {
				cancelAnimationFrame(animRef.current);
			}
		};
	}, [open, width, animate]);

	const classNames = [
		'helm-side-drawer',
		!open && 'helm-side-drawer--closed',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const rootStyle: CSSProperties = {
		'--helm-drawer-width': `${width}px`,
		...style,
	} as CSSProperties;

	return (
		<div className={classNames} style={rootStyle} data-testid={testId}>
			<div className="helm-side-drawer__viewport">{viewport}</div>
			<div ref={wrapperRef} className="helm-side-drawer__wrapper">
				<button
					type="button"
					className="helm-side-drawer__toggle"
					onClick={onToggle}
					aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
					aria-expanded={open}
					aria-controls={panelId}
				>
					<Icon
						className="helm-side-drawer__chevron"
						icon={open ? chevronRight : chevronLeft}
						size={16}
					/>
				</button>
				<div
					className="helm-side-drawer__drawer"
					id={panelId}
					role="region"
					aria-label="Sidebar"
				>
					<div className="helm-side-drawer__content">{children}</div>
				</div>
			</div>
		</div>
	);
}
