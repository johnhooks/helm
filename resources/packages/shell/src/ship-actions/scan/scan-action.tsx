import { useDispatch, useSelect } from '@wordpress/data';
import type { DraftAction, ShipAction } from '@helm/actions';
import { isScanRoute, store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { useShip, store as shipsStore } from '@helm/ships';
import type { ShipActionRenderProps } from '../types';
import { DraftScanCard } from './draft-scan-card';
import { ActiveScanCard } from './active-scan-card';
import { CompleteScanCard } from './complete-scan-card';
import { nodeDetails, scanItinerary } from '../itineraries';
import type { NodeDetails } from '../itineraries';
import { getScanTargetName } from './utils';

function DraftScan({ draft }: { draft: DraftAction<'scan_route'> }) {
	const { shipId } = useShip();
	const { targetNode, originNode, isSubmitting } = useSelect(
		(select) => ({
			targetNode: select(navStore).expectNode(
				draft.params.target_node_id
			),
			originNode: select(navStore).getNode(draft.params.source_node_id),
			isSubmitting: select(actionsStore).isCreating(),
		}),
		[draft.params.target_node_id, draft.params.source_node_id]
	);
	const targetName = getScanTargetName(targetNode);
	const details: NodeDetails = {
		[draft.params.target_node_id]: nodeDetails(
			targetNode,
			draft.params.target_node_id
		),
		[draft.params.source_node_id]: nodeDetails(
			originNode,
			draft.params.source_node_id
		),
	};
	const { clearDraft, createAction } = useDispatch(actionsStore);
	return (
		<DraftScanCard
			draft={draft}
			targetName={targetName}
			itinerary={scanItinerary(draft, targetName, details)}
			onCancel={clearDraft}
			onSubmit={() => createAction(shipId, draft.type, draft.params)}
			isSubmitting={isSubmitting}
		/>
	);
}

function ActiveScan({ action }: { action: ShipAction<'scan_route'> }) {
	const { ship } = useShip();
	const powerMode = useSelect(
		(select) =>
			select(shipsStore).getEdits()?.power_mode ?? ship.power_mode,
		[ship.power_mode]
	);
	const { targetNode, details } = useSelect(
		(select) => {
			const nav = select(navStore);
			const ids = [
				action.params.target_node_id,
				action.params.from_node_id ?? action.params.source_node_id,
				...(action.result?.path ?? []),
			];
			const nodeInfo: NodeDetails = {};
			for (const id of ids) {
				nodeInfo[id] = nodeDetails(nav.getNode(id), id);
			}
			return {
				targetNode: nav.expectNode(action.params.target_node_id),
				details: nodeInfo,
			};
		},
		[
			action.params.target_node_id,
			action.params.from_node_id,
			action.params.source_node_id,
			action.result?.path,
		]
	);
	const targetName = getScanTargetName(targetNode);
	return (
		<ActiveScanCard
			powerMode={powerMode}
			action={action}
			targetName={targetName}
			itinerary={scanItinerary(action, targetName, details)}
		/>
	);
}

function CompleteScan({ action }: { action: ShipAction<'scan_route'> }) {
	const { targetNode, details } = useSelect(
		(select) => {
			const nav = select(navStore);
			const ids = [
				action.params.target_node_id,
				action.params.from_node_id ?? action.params.source_node_id,
				...(action.result?.path ?? []),
			];
			const nodeInfo: NodeDetails = {};
			for (const id of ids) {
				nodeInfo[id] = nodeDetails(nav.getNode(id), id);
			}
			return {
				targetNode: nav.expectNode(action.params.target_node_id),
				details: nodeInfo,
			};
		},
		[
			action.params.target_node_id,
			action.params.from_node_id,
			action.params.source_node_id,
			action.result?.path,
		]
	);
	const targetName = getScanTargetName(targetNode);
	return (
		<CompleteScanCard
			action={action}
			targetName={targetName}
			itinerary={scanItinerary(action, targetName, details)}
		/>
	);
}

export function renderScanAction({ action, draft }: ShipActionRenderProps) {
	if (draft && isScanRoute(draft)) {
		return <DraftScan draft={draft} />;
	}
	if (!action || !isScanRoute(action)) {
		return null;
	}
	if (action.status === 'pending' || action.status === 'running') {
		return <ActiveScan action={action} />;
	}
	return <CompleteScan action={action} />;
}
