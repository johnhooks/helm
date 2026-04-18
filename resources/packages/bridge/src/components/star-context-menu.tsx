/**
 * Star Context Menu — rendered beside a selected star via Html overlay.
 *
 * Renders the selected star header and whatever actions the bridge provides.
 * Dismisses on Escape key.
 */
import { useEffect } from '@wordpress/element';
import { ContextMenu } from '@helm/ui';
import type { ContextMenuAction } from '@helm/ui';
import type { StarNode } from '@helm/types';

interface StarContextMenuProps {
	star: StarNode;
	actions: ContextMenuAction[];
	onClose: () => void;
}

export function StarContextMenu( {
	star,
	actions,
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

	return (
		<ContextMenu
			name={ star.title }
			subtitle={ star.spectral_class ?? undefined }
			actions={ actions }
		/>
	);
}
