import { useDispatch, useSelect } from '@wordpress/data';
import type { DraftAction, ShipAction } from '@helm/actions';
import { isJump, store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { useShip } from '@helm/ships';
import type { ShipActionRenderProps } from '../types';
import { DraftJumpCard } from './draft-jump-card';
import { ActiveJumpCard } from './active-jump-card';
import { CompleteJumpCard } from './complete-jump-card';
import { getJumpTargetName } from './utils';

function DraftJump({ draft }: { draft: DraftAction<'jump'> }) {
	const { shipId } = useShip();
	const { targetNode, isSubmitting, routePath, routeNodeNames } = useSelect(
		(select) => {
			const path = select(navStore).findKnownPath(
				draft.params.from_node_id,
				draft.params.target_node_id
			);
			return {
				targetNode: select(navStore).expectNode(
					draft.params.target_node_id
				),
				isSubmitting: select(actionsStore).isCreating(),
				routePath: path,
				routeNodeNames: select(navStore).getKnownPathNodeNames(
					draft.params.from_node_id,
					draft.params.target_node_id
				),
			};
		},
		[draft.params.from_node_id, draft.params.target_node_id]
	);
	const targetName = getJumpTargetName(targetNode);
	const { clearDraft, createAction } = useDispatch(actionsStore);
	return (
		<DraftJumpCard
			draft={draft}
			targetName={targetName}
			routePath={routePath}
			routeNodeNames={routeNodeNames}
			onCancel={clearDraft}
			onSubmit={() => createAction(shipId, draft.type, draft.params)}
			isSubmitting={isSubmitting}
		/>
	);
}

function ActiveJump({ action }: { action: ShipAction<'jump'> }) {
	const { targetNode } = useSelect(
		(select) => ({
			targetNode: select(navStore).expectNode(
				action.params.target_node_id
			),
		}),
		[action.params.target_node_id]
	);
	const targetName = getJumpTargetName(targetNode);
	return <ActiveJumpCard action={action} targetName={targetName} />;
}

function CompleteJump({ action }: { action: ShipAction<'jump'> }) {
	const { targetNode } = useSelect(
		(select) => ({
			targetNode: select(navStore).expectNode(
				action.params.target_node_id
			),
		}),
		[action.params.target_node_id]
	);
	const targetName = getJumpTargetName(targetNode);
	return <CompleteJumpCard action={action} targetName={targetName} />;
}

export function renderJumpAction({ action, draft }: ShipActionRenderProps) {
	if (draft && isJump(draft)) {
		return <DraftJump draft={draft} />;
	}
	if (!action || !isJump(action)) {
		return null;
	}
	if (action.status === 'pending' || action.status === 'running') {
		return <ActiveJump action={action} />;
	}
	return <CompleteJump action={action} />;
}
