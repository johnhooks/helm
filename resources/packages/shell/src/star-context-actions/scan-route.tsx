import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { ContextMenuActionItem } from '@helm/ui';
import type { StarContextActionProps } from './types';

export function ScanRouteContextAction({
	star,
	currentNodeId,
	selectedDistance,
	hasActiveAction,
	onClose,
}: StarContextActionProps) {
	const hasDirectEdge = useSelect(
		(select) =>
			select(navStore).hasDirectEdgeBetween(currentNodeId, star.node_id),
		[currentNodeId, star.node_id]
	);
	const { draftCreate } = useDispatch(actionsStore);

	if (star.node_id === currentNodeId || hasDirectEdge === true) {
		return null;
	}

	return (
		<ContextMenuActionItem
			label={__('Scan Route', 'helm')}
			detail={`${(selectedDistance ?? 0).toFixed(1)} ly`}
			disabled={hasActiveAction}
			onClick={() => {
				draftCreate({
					type: 'scan_route',
					params: {
						target_node_id: star.node_id,
						source_node_id: currentNodeId,
						distance_ly: selectedDistance,
					},
				});
				onClose();
			}}
		/>
	);
}
