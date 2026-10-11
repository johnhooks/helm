import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import './disclosure.css';

export interface DisclosureProps {
	label: string;
	children: ReactNode;
	defaultOpen?: boolean;
	className?: string;
}

/**
 * Compact disclosure that inherits its parent's --helm-tone.
 */
export function Disclosure({
	label,
	children,
	defaultOpen = false,
	className = '',
}: DisclosureProps) {
	const [open, setOpen] = useState(defaultOpen);
	const id = useId();
	return (
		<div className={`helm-disclosure ${className}`}>
			<div className="helm-disclosure__strip">
				<span className="helm-disclosure__line" aria-hidden="true" />
				<button
					type="button"
					className="helm-disclosure__toggle"
					aria-expanded={open}
					aria-controls={id}
					onClick={() => setOpen((previous) => !previous)}
				>
					<span>{label}</span>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						aria-hidden="true"
						focusable="false"
					>
						<path d={open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} />
					</svg>
				</button>
			</div>
			<div
				id={id}
				className="helm-disclosure__reveal"
				data-open={open}
				aria-hidden={!open}
				ref={(element) => {
					if (element) {
						element.inert = !open;
					}
				}}
			>
				<div className="helm-disclosure__clip">
					<div className="helm-disclosure__content">{children}</div>
				</div>
			</div>
		</div>
	);
}
