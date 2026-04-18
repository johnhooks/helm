import { __ } from '@wordpress/i18n';
import type { ContextMenuAction } from '@helm/ui';
import type { StarNode } from '@helm/types';

interface GetStarContextMenuActionsArgs {
	selectedStar: StarNode | null;
	currentNodeId: number;
	selectedDistance: number | null;
	hasActiveAction: boolean;
	onScanRoute: () => void;
	onClose: () => void;
}

export function getStarContextMenuActions( {
	selectedStar,
	currentNodeId,
	selectedDistance,
	hasActiveAction,
	onScanRoute,
	onClose,
}: GetStarContextMenuActionsArgs ): ContextMenuAction[] {
	if ( ! selectedStar || selectedStar.node_id === currentNodeId ) {
		return [];
	}

	return [
		{
			label: __( 'Scan Route', 'helm' ),
			detail: `${ ( selectedDistance ?? 0 ).toFixed( 1 ) } ly`,
			disabled: hasActiveAction,
			onClick: () => {
				onScanRoute();
				onClose();
			},
		},
		{
			label: __( 'Jump', 'helm' ),
			detail: __( 'route unknown', 'helm' ),
			disabled: true,
		},
	];
}
