import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { ContextMenuActionItem } from '@helm/ui';
import type { AstrometricActionProps } from './types';

export function JumpAstrometricAction({
	target,
	currentNodeId,
	hasActiveAction,
	onClose,
}: AstrometricActionProps) {
	const knownPath = useSelect(
		(select) =>
			select(navStore).findKnownPath(currentNodeId, target.nodeId),
		[currentNodeId, target.nodeId]
	);
	const { draftCreate } = useDispatch(actionsStore);

	const isCurrentNode = target.nodeId === currentNodeId;

	if (!isCurrentNode && knownPath === undefined) {
		return null;
	}

	if (!isCurrentNode && knownPath?.reachable !== true) {
		return null;
	}

	const disabled = isCurrentNode || hasActiveAction;

	let detail: string;
	if (isCurrentNode) {
		detail = __('already here', 'helm');
	} else if (hasActiveAction) {
		detail = __('action in progress', 'helm');
	} else if (knownPath?.direct) {
		detail = `${knownPath.totalDistance.toFixed(1)} ly`;
	} else {
		detail = sprintf(
			/* translators: %1$d: hop count, %2$.1f: route distance in light years */
			__('%1$d hops · %2$.1f ly', 'helm'),
			knownPath?.edgeIds.length ?? 0,
			knownPath?.totalDistance ?? 0
		);
	}

	return (
		<ContextMenuActionItem
			label={__('Jump', 'helm')}
			detail={detail}
			disabled={disabled}
			onClick={() => {
				if (!knownPath?.reachable) {
					return;
				}

				draftCreate({
					type: 'jump',
					params: {
						from_node_id: currentNodeId,
						target_node_id: target.nodeId,
						route: knownPath.edgeIds,
					},
				});
				onClose();
			}}
		/>
	);
}
