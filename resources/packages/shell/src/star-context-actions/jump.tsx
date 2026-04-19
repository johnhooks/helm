import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import { ContextMenuActionItem } from '@helm/ui';
import type { StarContextActionProps } from './types';

export function JumpContextAction( { star, currentNodeId }: StarContextActionProps ) {
	const routeKnown = useSelect(
		( select ) => select( actionsStore ).hasFulfilledScanRouteTo( star.node_id ),
		[ star.node_id ]
	);

	if ( star.node_id === currentNodeId || ! routeKnown ) {
		return null;
	}

	return (
		<ContextMenuActionItem
			label={ __( 'Jump', 'helm' ) }
			detail={ __( 'route unknown', 'helm' ) }
			disabled
		/>
	);
}
