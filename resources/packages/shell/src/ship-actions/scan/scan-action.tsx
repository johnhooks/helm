import { useDispatch, useSelect } from '@wordpress/data';
import type { DraftAction, ShipAction } from '@helm/actions';
import { isScanRoute, store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { useShip } from '@helm/ships';
import type { ShipActionRenderProps } from '../types';
import { DraftScanCard } from './draft-scan-card';
import { ActiveScanCard } from './active-scan-card';
import { CompleteScanCard } from './complete-scan-card';
import { getScanTargetName } from './utils';

function DraftScan({ draft }: { draft: DraftAction<'scan_route'> }) {
	const { shipId } = useShip();
	const { targetNode, isSubmitting } = useSelect(
		(select) => ({
			targetNode: select(navStore).expectNode(
				draft.params.target_node_id
			),
			isSubmitting: select(actionsStore).isCreating(),
		}),
		[draft.params.target_node_id]
	);
	const targetName = getScanTargetName(targetNode);
	const { clearDraft, createAction } = useDispatch(actionsStore);
	return (
		<DraftScanCard
			draft={draft}
			targetName={targetName}
			onCancel={clearDraft}
			onSubmit={() => createAction(shipId, draft.type, draft.params)}
			isSubmitting={isSubmitting}
		/>
	);
}

function ActiveScan({ action }: { action: ShipAction<'scan_route'> }) {
	const { targetNode } = useSelect(
		(select) => ({
			targetNode: select(navStore).expectNode(
				action.params.target_node_id
			),
		}),
		[action.params.target_node_id]
	);
	const targetName = getScanTargetName(targetNode);
	return <ActiveScanCard action={action} targetName={targetName} />;
}

function CompleteScan({ action }: { action: ShipAction<'scan_route'> }) {
	const { targetNode } = useSelect(
		(select) => ({
			targetNode: select(navStore).expectNode(
				action.params.target_node_id
			),
		}),
		[action.params.target_node_id]
	);
	const targetName = getScanTargetName(targetNode);
	return <CompleteScanCard action={action} targetName={targetName} />;
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
