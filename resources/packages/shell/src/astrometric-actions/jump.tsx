import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { ContextMenuActionItem } from '@helm/ui';
import type { AstrometricActionProps } from './types';

export function JumpAstrometricAction({
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

	const isCurrentNode = target.nodeId === currentNodeId;
	const disabled = isCurrentNode || hasDirectEdge !== true || hasActiveAction;

	let detail: string;
	if (isCurrentNode) {
		detail = __('already here', 'helm');
	} else if (hasActiveAction) {
		detail = __('action in progress', 'helm');
	} else if (hasDirectEdge !== true) {
		detail = __('route unknown', 'helm');
	} else {
		detail = `${(selectedDistance ?? 0).toFixed(1)} ly`;
	}

	return (
		<ContextMenuActionItem
			label={__('Jump', 'helm')}
			detail={detail}
			disabled={disabled}
			onClick={() => {
				draftCreate({
					type: 'jump',
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
