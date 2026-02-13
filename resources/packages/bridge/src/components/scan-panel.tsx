/**
 * Scan Panel — shows scan target info, progress, and results.
 *
 * Three states:
 * 1. Star selected, no action → target name, distance, "Scan Route" button
 * 2. Action in progress → countdown to deferred_until
 * 3. Action complete → result summary, dismiss button
 */
import { useCallback, useEffect, useState } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import { Button, Countdown, Readout, Title } from '@helm/ui';
import type { StarNode } from '@helm/types';

interface ScanPanelProps {
	shipId: number;
	selectedStar: StarNode | null;
	distance: number | null;
}

function getRemainingSeconds( deferredUntil: string | null ): number {
	if ( ! deferredUntil ) {
		return 0;
	}
	const target = new Date( deferredUntil ).getTime();
	return Math.max( 0, Math.floor( ( target - Date.now() ) / 1000 ) );
}

export function ScanPanel( { shipId, selectedStar, distance }: ScanPanelProps ) {
	const action = useSelect(
		( select ) => select( actionsStore ).getCurrentAction( shipId ),
		[ shipId ]
	);
	const isCreatingAction = useSelect(
		( select ) => select( actionsStore ).isCreating( shipId ),
		[ shipId ]
	);
	const { createAction, clearAction } = useDispatch( actionsStore );

	const handleScan = useCallback( () => {
		if ( ! selectedStar ) {
			return;
		}
		createAction( shipId, 'scan_route', { target_node_id: selectedStar.node_id } );
	}, [ shipId, selectedStar, createAction ] );

	const handleDismiss = useCallback( () => {
		clearAction( shipId );
	}, [ shipId, clearAction ] );

	// Live countdown timer.
	const [ remaining, setRemaining ] = useState( () =>
		getRemainingSeconds( action?.deferred_until ?? null )
	);

	useEffect( () => {
		if ( ! action?.deferred_until ) {
			return;
		}
		const status = action.status;
		if ( status !== 'pending' && status !== 'running' ) {
			return;
		}

		setRemaining( getRemainingSeconds( action.deferred_until ) );

		const interval = setInterval( () => {
			setRemaining( getRemainingSeconds( action.deferred_until! ) );
		}, 1000 );

		return () => clearInterval( interval );
	}, [ action?.deferred_until, action?.status ] );

	// Action in progress.
	if ( action && ( action.status === 'pending' || action.status === 'running' ) ) {
		const targetName = ( action.params as Record< string, unknown > ).target_name as string | undefined;
		return (
			<div className="helm-scan-panel">
				<Title label={ __( 'Scan Route', 'helm' ) } />
				<Readout
					label={ __( 'Status', 'helm' ) }
					value={ __( 'Scanning\u2026', 'helm' ) }
				/>
				{ targetName && (
					<Readout
						label={ __( 'Target', 'helm' ) }
						value={ targetName }
					/>
				) }
				<Countdown
					label={ __( 'ETA', 'helm' ) }
					remaining={ remaining }
					tone="sky"
					active
				/>
			</div>
		);
	}

	// Action complete.
	if ( action && ( action.status === 'fulfilled' || action.status === 'partial' || action.status === 'failed' ) ) {
		const result = action.result as Record< string, unknown > | null;
		const edgeCount = ( result?.edges as unknown[] )?.length ?? 0;
		const nodeCount = ( result?.nodes as unknown[] )?.length ?? 0;
		const complete = result?.complete as boolean | undefined;

		return (
			<div className="helm-scan-panel">
				<Title label={ __( 'Scan Complete', 'helm' ) } />
				{ action.status === 'failed' ? (
					<Readout
						label={ __( 'Status', 'helm' ) }
						value={ __( 'Failed', 'helm' ) }
					/>
				) : (
					<>
						<Readout
							label={ __( 'Waypoints', 'helm' ) }
							value={ String( nodeCount ) }
						/>
						<Readout
							label={ __( 'Edges', 'helm' ) }
							value={ String( edgeCount ) }
						/>
						{ complete && (
							<Readout
								label={ __( 'Route', 'helm' ) }
								value={ __( 'Charted', 'helm' ) }
							/>
						) }
					</>
				) }
				<Button
					onClick={ handleDismiss }
					variant="secondary"
					size="sm"
				>
					{ __( 'Dismiss', 'helm' ) }
				</Button>
			</div>
		);
	}

	// No action, star selected.
	if ( selectedStar && distance !== null ) {
		return (
			<div className="helm-scan-panel">
				<Title label={ __( 'Scan Route', 'helm' ) } />
				<Readout
					label={ __( 'Target', 'helm' ) }
					value={ selectedStar.title }
				/>
				<Readout
					label={ __( 'Distance', 'helm' ) }
					value={ `${ distance.toFixed( 1 ) } ly` }
				/>
				<Button
					onClick={ handleScan }
					disabled={ isCreatingAction }
				>
					{ __( 'Scan Route', 'helm' ) }
				</Button>
			</div>
		);
	}

	// Nothing selected.
	return null;
}
