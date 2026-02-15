/**
 * Scan Panel — shows scan progress and results.
 *
 * Two states:
 * 1. Action in progress → countdown to deferred_until
 * 2. Action complete → result summary
 *
 * Scan initiation is handled by StarContextMenu.
 */
import { useEffect, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as actionsStore } from '@helm/actions';
import { Countdown, Readout, Title } from '@helm/ui';

function getRemainingSeconds( deferredUntil: string | null ): number {
	if ( ! deferredUntil ) {
		return 0;
	}
	const target = new Date( deferredUntil ).getTime();
	return Math.max( 0, Math.floor( ( target - Date.now() ) / 1000 ) );
}

export function ScanPanel() {
	const action = useSelect(
		( select ) => select( actionsStore ).getLatestAction(),
		[]
	);

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
			</div>
		);
	}

	// No active action.
	return null;
}
