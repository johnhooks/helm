import { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Button, Countdown, LogCard, ProgressBar, Readout, SystemCell, SystemGrid } from '@helm/ui';
import type { LcarsTone } from '@helm/ui';
import type { ShipAction } from '@helm/actions';
import { isActive } from '@helm/actions';
import { ActionStatusBadge } from '../action-status';
import { getRemainingSeconds } from '../utils';
import { getScanTitle } from './utils';

export function ActiveScanCard( { action, targetName }: { action: ShipAction< 'scan_route' >; targetName: string } ) {
	const tone = 'lilac';

	if ( ! isActive( action ) ) {
		return null;
	}

	const result = action.result;
	const title = getScanTitle( action.type, targetName );
	const status = <ActionStatusBadge status={ action.status } />;

	return (
		<LogCard
			time={ __( 'now', 'helm' ) }
			title={ title }
			tone={ tone }
			variant="active"
			status={ status }
		>
			<div style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
				<SystemGrid columns={ 3 } gap="sm">
					<SystemCell>
						<Readout
							label={ __( 'Distance', 'helm' ) }
							value={ action.params.distance_ly }
							unit="ly"
							tone={ tone }
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={ __( 'Duration', 'helm' ) }
							value={ result?.duration ?? '--' }
							tone={ tone }
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={ __( 'Waypoints', 'helm' ) }
							value={ result?.nodes ? String( result.nodes.length ) : '--' }
							tone={ tone }
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
				<ActiveScanProgress action={ action } tone={ tone } />
			</div>
		</LogCard>
	);
}

function ActiveScanProgress( { action, tone }: { action: ShipAction< 'scan_route' > & { status: 'pending' | 'running' }; tone: LcarsTone } ) {
	const result = action.result;
	const [ remaining, setRemaining ] = useState( () =>
		getRemainingSeconds( action.deferred_until )
	);

	useEffect( () => {
		if ( ! action.deferred_until ) {
			return;
		}
		setRemaining( getRemainingSeconds( action.deferred_until ) );
		const interval = setInterval( () => {
			setRemaining( getRemainingSeconds( action.deferred_until! ) );
		}, 1000 );
		return () => clearInterval( interval );
	}, [ action.deferred_until ] );

	return (
		<>
			{ result && (
				<ProgressBar value={ Math.max( 0, Math.min( 100, result.efficiency ) ) } tone={ tone } size="sm" />
			) }
			{ action.deferred_until && (
				<div className={ `helm-flex helm-items-center helm-justify-between helm-gap-x-3 helm-tone--${ tone }` }>
					<Countdown
						label={ __( 'Remaining', 'helm' ) }
						remaining={ remaining }
						tone={ tone }
						active
						size="sm"
					/>
					<div className="helm-flex helm-items-center helm-justify-end helm-gap-x-2">
						<Button size="sm" variant="tertiary">{ __( 'Cancel', 'helm' ) }</Button>
					</div>
				</div>
			) }
		</>
	);
}
