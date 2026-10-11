import { useDispatch, useSelect } from '@wordpress/data';
import type { DraftAction, ShipAction } from '@helm/actions';
import { isJump, store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { useShip } from '@helm/ships';
import type { ShipActionRenderProps } from '../types';
import { DraftJumpCard } from './draft-jump-card';
import { ActiveJumpCard } from './active-jump-card';
import { CompleteJumpCard } from './complete-jump-card';
import { jumpItinerary, jumpPath, nodeDetails } from '../itineraries';
import type { NodeDetails } from '../itineraries';
import { getJumpTargetName } from './utils';

function useJumpDetails(value: DraftAction<'jump'> | ShipAction<'jump'>) {
	const { from_node_id: from, target_node_id: target } = value.params;
	const current =
		'status' in value ? value.result?.current_node_id : undefined;
	return useSelect(
		(select) => {
			const nav = select(navStore);
			const path = nav.findKnownPath(from, target);
			const userEdges = nav.getUserEdges();
			const acceptedPath = jumpPath(value, path, userEdges);
			const ids = new Set([
				...(acceptedPath ?? [current ?? from]),
				target,
			]);
			const details: NodeDetails = {};
			for (const id of ids) {
				details[id] = nodeDetails(nav.getNode(id), id);
			}
			return {
				targetName: getJumpTargetName(nav.expectNode(target)),
				routePath: path,
				userEdges,
				details,
				routeNodeNames:
					acceptedPath?.map((id) => details[id].label) ?? [],
			};
		},
		[value, from, target, current]
	);
}

function DraftJump({ draft }: { draft: DraftAction<'jump'> }) {
	const { shipId } = useShip();
	const { targetName, routePath, routeNodeNames, userEdges, details } =
		useJumpDetails(draft);
	const isSubmitting = useSelect(
		(select) => select(actionsStore).isCreating(),
		[]
	);
	const routeMatchesPath =
		routePath?.edgeIds.length === draft.params.route.length &&
		draft.params.route.every(
			(edgeId, index) => routePath.edgeIds[index] === edgeId
		);
	const { clearDraft, createAction } = useDispatch(actionsStore);
	return (
		<DraftJumpCard
			draft={draft}
			targetName={targetName}
			routePath={routeMatchesPath ? routePath : undefined}
			routeNodeNames={routeNodeNames}
			itinerary={jumpItinerary(
				draft,
				targetName,
				routePath,
				userEdges,
				details
			)}
			onCancel={clearDraft}
			onSubmit={() => createAction(shipId, draft.type, draft.params)}
			isSubmitting={isSubmitting}
		/>
	);
}

function ActiveJump({ action }: { action: ShipAction<'jump'> }) {
	const { targetName, routePath, userEdges, details } =
		useJumpDetails(action);
	return (
		<ActiveJumpCard
			action={action}
			targetName={targetName}
			itinerary={jumpItinerary(
				action,
				targetName,
				routePath,
				userEdges,
				details
			)}
		/>
	);
}

function CompleteJump({ action }: { action: ShipAction<'jump'> }) {
	const { targetName, routePath, userEdges, details } =
		useJumpDetails(action);
	return (
		<CompleteJumpCard
			action={action}
			targetName={targetName}
			itinerary={jumpItinerary(
				action,
				targetName,
				routePath,
				userEdges,
				details
			)}
		/>
	);
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
