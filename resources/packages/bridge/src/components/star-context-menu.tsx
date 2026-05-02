/**
 * Star Context Menu — rendered beside a selected star via Html overlay.
 *
 * Each context-menu entry is self-determining: it reads store state via
 * useSelect and returns null when it doesn't apply. The menu composes them
 * inline; CSS (`.helm-context-menu__actions:empty`) hides the wrapper when
 * nothing renders, so the header stays flush on selections with no actions.
 *
 * Dismisses on Escape key.
 */
import { useEffect } from '@wordpress/element';
import { ContextMenu } from '@helm/ui';
import type { StarNode } from '@helm/types';
import {
	JumpContextAction,
	ScanRouteContextAction,
	type StarContextActionProps,
} from '@helm/shell';

interface StarContextMenuProps {
	star: StarNode;
	currentNodeId: number;
	selectedDistance: number | null;
	hasActiveAction: boolean;
	onClose: () => void;
}

export function StarContextMenu({
	star,
	currentNodeId,
	selectedDistance,
	hasActiveAction,
	onClose,
}: StarContextMenuProps) {
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

	const actionProps: StarContextActionProps = {
		star,
		currentNodeId,
		selectedDistance,
		hasActiveAction,
		onClose,
	};

	return (
		<ContextMenu
			name={star.title}
			subtitle={star.spectral_class ?? undefined}
		>
			<ScanRouteContextAction {...actionProps} />
			<JumpContextAction {...actionProps} />
		</ContextMenu>
	);
}
