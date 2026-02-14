/**
 * Star Context Menu — rendered beside a selected star via Html overlay.
 *
 * Shows available actions: Scan Route (active) and Jump (disabled placeholder).
 * Dismisses on Escape key or when an action is clicked.
 */
import { useCallback, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { ContextMenu } from '@helm/ui';
import type { ContextMenuAction } from '@helm/ui';
import type { StarNode } from '@helm/types';

interface StarContextMenuProps {
	star: StarNode;
	distance: number;
	hasActiveAction: boolean;
	onScanRoute: () => void;
	onClose: () => void;
}

export function StarContextMenu( {
	star,
	distance,
	hasActiveAction,
	onScanRoute,
	onClose,
}: StarContextMenuProps ) {
	// Dismiss on Escape.
	useEffect( () => {
		const handleKeyDown = ( event: KeyboardEvent ) => {
			if ( event.key === 'Escape' ) {
				onClose();
			}
		};
		document.addEventListener( 'keydown', handleKeyDown );
		return () => document.removeEventListener( 'keydown', handleKeyDown );
	}, [ onClose ] );

	const handleScanRoute = useCallback( () => {
		onScanRoute();
		onClose();
	}, [ onScanRoute, onClose ] );

	const actions: ContextMenuAction[] = [
		{
			label: __( 'Scan Route', 'helm' ),
			detail: `${ distance.toFixed( 1 ) } ly`,
			disabled: hasActiveAction,
			onClick: handleScanRoute,
		},
		{
			label: __( 'Jump', 'helm' ),
			detail: __( 'route unknown', 'helm' ),
			disabled: true,
		},
	];

	return (
		<ContextMenu
			name={ star.title }
			subtitle={ star.spectral_class ?? undefined }
			actions={ actions }
		/>
	);
}
