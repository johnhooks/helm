import { useDispatch, useSelect } from '@wordpress/data';
import type { DraftAction, ShipAction } from '@helm/actions';
import { isScanRoute, store as actionsStore } from '@helm/actions';
import { store as navStore } from '@helm/nav';
import { useShip } from '@helm/ships';
import { ShipActionFill } from '../ship-action-slot';
import type { ShipActionRenderProps } from '../types';
import { DraftScanCard } from './draft-scan-card';
import { ActiveScanCard } from './active-scan-card';
import { CompleteScanCard } from './complete-scan-card';

const SCAN_TYPES = [ 'scan_route' ] as const;

function DraftScan( { draft }: { draft: DraftAction< 'scan_route' > } ) {
	const { shipId } = useShip();
	const { targetName, isSubmitting } = useSelect( ( select ) => ( {
		targetName: select( navStore ).expectNode( draft.params.target_node_id ).title,
		isSubmitting: select( actionsStore ).isCreating(),
	} ), [ draft.params.target_node_id ] );
	const { clearDraft, createAction } = useDispatch( actionsStore );
	return (
		<DraftScanCard
			draft={ draft }
			targetName={ targetName }
			onCancel={ clearDraft }
			onSubmit={ () => createAction( shipId, draft.type, draft.params ) }
			isSubmitting={ isSubmitting }
		/>
	);
}

function ActiveScan( { action }: { action: ShipAction< 'scan_route' > } ) {
	const { targetName } = useSelect( ( select ) => ( {
		targetName: select( navStore ).expectNode( action.params.target_node_id ).title,
	} ), [ action.params.target_node_id ] );
	return <ActiveScanCard action={ action } targetName={ targetName } />;
}

function CompleteScan( { action }: { action: ShipAction< 'scan_route' > } ) {
	const { targetName } = useSelect( ( select ) => ( {
		targetName: select( navStore ).expectNode( action.params.target_node_id ).title,
	} ), [ action.params.target_node_id ] );
	return <CompleteScanCard action={ action } targetName={ targetName } />;
}

function renderScanAction( { action, draft }: ShipActionRenderProps ) {
	if ( draft && isScanRoute( draft ) ) {
		return <DraftScan draft={ draft } />;
	}
	if ( ! action ) {
		return <></>;
	}
	if ( ! isScanRoute( action ) ) {
		return <></>;
	}
	if ( action.status === 'pending' || action.status === 'running' ) {
		return <ActiveScan action={ action } />;
	}
	return <CompleteScan action={ action } />;
}

export function ScanActionFill() {
	return (
		<>
			{ SCAN_TYPES.map( ( type ) => (
				<ShipActionFill key={ type } type={ type } render={ renderScanAction } />
			) ) }
		</>
	);
}
