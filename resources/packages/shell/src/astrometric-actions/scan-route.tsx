import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { ContextMenuActionItem } from '@helm/ui';
import type { AstrometricActionProps } from './types';

export function ScanRouteAstrometricAction({
	target,
	currentNodeId,
	selectedDistance,
	hasActiveAction,
	onClose,
}: AstrometricActionProps) {
	const hasDirectEdge = useSelect(
		(select) =>
			select(navStore).hasDirectEdgeBetween(currentNodeId, target.nodeId),
		[currentNodeId, target.nodeId]
	);
	const { draftCreate } = useDispatch(actionsStore);

	if (target.kind !== 'star') {
		return null;
	}

	if (target.nodeId === currentNodeId || hasDirectEdge === true) {
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
						target_node_id: target.nodeId,
						source_node_id: currentNodeId,
						distance_ly: selectedDistance,
					},
				});
				onClose();
			}}
		/>
	);
}
