/**
 * Astrometric Menu — rendered beside a selected astrometric target via Html overlay.
 *
 * Each astrometric action is self-determining: it reads store state via
 * useSelect and returns null when it doesn't apply. The menu composes them
 * inline; CSS (`.helm-context-menu__actions:empty`) hides the wrapper when
 * nothing renders, so the header stays flush on selections with no actions.
 *
 * Dismisses on Escape key.
 */
import { useEffect } from '@wordpress/element';
import { ContextMenu } from '@helm/ui';
import type { NavigationTarget } from '@helm/astrometric';
import {
	JumpAstrometricAction,
	ScanRouteAstrometricAction,
	type AstrometricActionProps,
} from '@helm/shell';

interface AstrometricMenuProps {
	target: NavigationTarget;
	currentNodeId: number;
	selectedDistance: number | null;
	hasActiveAction: boolean;
	onClose: () => void;
}

export function AstrometricMenu({
	target,
	currentNodeId,
	selectedDistance,
	hasActiveAction,
	onClose,
}: AstrometricMenuProps) {
	// Dismiss on Escape.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	const actionProps: AstrometricActionProps = {
		target,
		currentNodeId,
		selectedDistance,
		hasActiveAction,
		onClose,
	};

	return (
		<ContextMenu
			name={target.label}
			subtitle={
				target.kind === 'star'
					? target.star?.spectral_class ?? undefined
					: undefined
			}
		>
			<ScanRouteAstrometricAction {...actionProps} />
			<JumpAstrometricAction {...actionProps} />
		</ContextMenu>
	);
}
