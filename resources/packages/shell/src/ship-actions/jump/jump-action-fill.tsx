import { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Button, Countdown, LogCard, ProgressBar, Readout, StatusBadge, SystemCell, SystemGrid } from '@helm/ui';
import type { DraftAction, ShipAction } from '@helm/actions';
import { ShipActionFill } from '../ship-action-slot';
import type { ShipActionRenderProps } from '../types';
import { ActionStatusBadge } from '../action-status';

const JUMP_TYPES = [ 'jump' ] as const;

const JUMP_TITLE: Record< string, string > = {
	jump: __( 'Jump', 'helm' ),
};

function formatTime( iso: string ): string {
	const date = new Date( iso );
	return date.toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
}

function getRemainingSeconds( deferredUntil: string | null ): number {
	if ( ! deferredUntil ) {
		return 0;
	}
	const target = new Date( deferredUntil ).getTime();
	return Math.max( 0, Math.floor( ( target - Date.now() ) / 1000 ) );
}

function getTargetName( params: Record< string, unknown > | null | undefined ) {
	return params?.target_name as string | undefined;
}

function getDurationLabel( params: Record< string, unknown > | null | undefined ) {
	return params?.duration as string | undefined;
}

function getPowerCost( params: Record< string, unknown > | null | undefined ) {
	return params?.power_cost as number | undefined;
}

function getDistanceLy( params: Record< string, unknown > | null | undefined ) {
	return params?.distance_ly as number | undefined;
}

function getProgressValue( params: Record< string, unknown > | null | undefined ) {
	const value = params?.progress as number | undefined;
	if ( value === undefined ) {
		return undefined;
	}
	return Math.max( 0, Math.min( 100, value ) );
}

function getSpeedLyPerDay( params: Record< string, unknown > | null | undefined ) {
	return params?.speed_ly_per_day as number | undefined;
}

function getJumpTitle( type: string, targetName?: string ) {
	const baseTitle = JUMP_TITLE[ type ] ?? __( 'Jump', 'helm' );
	return targetName ? `${ baseTitle } — ${ targetName }` : baseTitle;
}


function DraftJumpCard( { draft }: { draft: DraftAction } ) {
	const tone = 'sky';
	const params = draft.params as Record< string, unknown >;
	const targetName = getTargetName( params );
	const duration = getDurationLabel( params );
	const distanceLy = getDistanceLy( params );
	const powerCost = getPowerCost( params );
	const title = getJumpTitle( draft.type, targetName );

	return (
		<LogCard
			time={ __( 'draft', 'helm' ) }
			title={ title }
			tone={ tone }
			variant="draft"
			status={ <StatusBadge tone="warning" size="sm">{ __( 'Pending', 'helm' ) }</StatusBadge> }
			action={
				<div className={ `helm-tone--${ tone } helm-flex helm-items-center helm-justify-end helm-gap-x-2` }>
					<Button size="sm" variant="tertiary">{ __( 'Cancel', 'helm' ) }</Button>
					<Button size="sm" variant="primary">{ __( 'Confirm Jump', 'helm' ) }</Button>
				</div>
			}
		>
			<SystemGrid columns={ 3 } gap="sm">
				<SystemCell>
					<Readout
						label={ __( 'Duration', 'helm' ) }
						value={ duration ?? '--' }
						tone={ tone }
						size="sm"
					/>
				</SystemCell>
				<SystemCell>
					<Readout
						label={ __( 'Distance', 'helm' ) }
						value={ distanceLy ?? '--' }
						unit={ distanceLy !== undefined ? 'ly' : undefined }
						tone={ tone }
						size="sm"
					/>
				</SystemCell>
				<SystemCell>
					<Readout
						label={ __( 'Power', 'helm' ) }
						value={ powerCost ?? '--' }
						unit={ powerCost !== undefined ? '%' : undefined }
						tone="gold"
						size="sm"
					/>
				</SystemCell>
			</SystemGrid>
		</LogCard>
	);
}

function ActiveJumpCard( { action }: { action: ShipAction } ) {
	const tone = 'sky';
	const params = action.params as Record< string, unknown >;
	const targetName = getTargetName( params );
	const duration = getDurationLabel( params );
	const distanceLy = getDistanceLy( params );
	const speedLyPerDay = getSpeedLyPerDay( params );
	const progressValue = getProgressValue( params );
	const title = getJumpTitle( action.type, targetName );
	const status = <ActionStatusBadge status={ action.status } />;
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
							label={ __( 'Duration', 'helm' ) }
							value={ duration ?? '--' }
							tone={ tone }
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={ __( 'Distance', 'helm' ) }
							value={ distanceLy ?? '--' }
							unit={ distanceLy !== undefined ? 'ly' : undefined }
							tone={ tone }
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={ __( 'Speed', 'helm' ) }
							value={ speedLyPerDay ?? '--' }
							unit={ speedLyPerDay !== undefined ? 'ly/d' : undefined }
							tone={ tone }
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
				{ progressValue !== undefined && (
					<ProgressBar value={ progressValue } tone={ tone } size="sm" />
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
			</div>
		</LogCard>
	);
}

function CompleteJumpCard( { action }: { action: ShipAction } ) {
	const tone = 'sky';
	const params = action.params as Record< string, unknown >;
	const targetName = getTargetName( params );
	const title = getJumpTitle( action.type, targetName );
	const status = <ActionStatusBadge status={ action.status } />;
	const time = formatTime( action.created_at );
	const duration = getDurationLabel( params );
	const distanceLy = getDistanceLy( params );
	const speedLyPerDay = getSpeedLyPerDay( params );
	const result = action.result as Record< string, unknown > | null;
	const failureCause = result?.cause as string | undefined;
	const failedStyle = action.status === 'failed'
		? { borderColor: 'var(--helm-ui-color-danger)' }
		: undefined;

	return (
		<LogCard
			time={ time }
			title={ title }
			tone={ tone }
			variant="default"
			status={ status }
			style={ failedStyle }
		>
			{ action.status === 'failed' ? (
				<SystemGrid columns={ 3 } gap="sm">
					<SystemCell>
						<Readout
							label={ __( 'Duration', 'helm' ) }
							value={ duration ?? '--' }
							tone={ tone }
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={ __( 'Distance', 'helm' ) }
							value={ distanceLy ?? '--' }
							unit={ distanceLy !== undefined ? 'ly' : undefined }
							tone={ tone }
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={ __( 'Cause', 'helm' ) }
							value={ failureCause ?? __( 'Unknown', 'helm' ) }
							tone="orange"
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
			) : (
				<div style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
					<SystemGrid columns={ 3 } gap="sm">
						<SystemCell>
							<Readout
								label={ __( 'Duration', 'helm' ) }
								value={ duration ?? '--' }
								tone={ tone }
								size="sm"
							/>
						</SystemCell>
						<SystemCell>
							<Readout
								label={ __( 'Distance', 'helm' ) }
								value={ distanceLy ?? '--' }
								unit={ distanceLy !== undefined ? 'ly' : undefined }
								tone={ tone }
								size="sm"
							/>
						</SystemCell>
						<SystemCell>
							<Readout
								label={ __( 'Speed', 'helm' ) }
								value={ speedLyPerDay ?? '--' }
								unit={ speedLyPerDay !== undefined ? 'ly/d' : undefined }
								tone={ tone }
								size="sm"
							/>
						</SystemCell>
					</SystemGrid>
				</div>
			) }
		</LogCard>
	);
}

function renderJumpAction( { action, draft }: ShipActionRenderProps ) {
	if ( draft ) {
		return <DraftJumpCard draft={ draft } />;
	}
	if ( ! action ) {
		return <></>;
	}
	if ( action.status === 'pending' || action.status === 'running' ) {
		return <ActiveJumpCard action={ action } />;
	}
	return <CompleteJumpCard action={ action } />;
}

export function JumpActionFill() {
	return (
		<>
			{ JUMP_TYPES.map( ( type ) => (
				<ShipActionFill key={ type } type={ type } render={ renderJumpAction } />
			) ) }
		</>
	);
}
