import { useEffect, useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	Countdown,
	LogCard,
	Readout,
	ProgressBar,
	SystemCell,
	SystemGrid,
	RouteItinerary,
} from '@helm/ui';
import type { LcarsTone, RouteItineraryProps } from '@helm/ui';
import type { ShipAction } from '@helm/actions';
import { isActive, formatScanPower } from '@helm/actions';
import { calculateRouteStats } from '@helm/formulas';
import { ActionStatusBadge } from '../action-status';
import { getRemainingSeconds, getProgressPercentage } from '../utils';
import { getScanTitle } from './utils';

export function ActiveScanCard({
	action,
	targetName,
	itinerary,
	powerMode,
}: {
	action: ShipAction<'scan_route'>;
	targetName: string;
	itinerary?: RouteItineraryProps;
	powerMode?: string;
}) {
	const tone = 'lilac';

	if (!isActive(action)) {
		return null;
	}

	const title = getScanTitle(action.type, targetName);
	const status = <ActionStatusBadge status={action.status} />;
	const progress = action.result?.progress;
	const chance = progress?.discovery_chance;
	const hasChance = typeof chance === 'number' && Number.isFinite(chance);
	const chanceLabel = hasChance ? `${(chance * 100).toFixed(1)}%` : '--';

	const inputs = progress?.calculation_inputs;
	const estimate = inputs
		? calculateRouteStats({
				...inputs,
				power_mode: powerMode ?? inputs.power_mode,
		  })
		: undefined;
	const peakSeconds =
		estimate?.estimated_peak_seconds ?? progress?.estimated_peak_seconds;
	let peakLabel = '--';
	if (typeof peakSeconds === 'number') {
		peakLabel =
			peakSeconds === 0
				? __('At peak', 'helm')
				: sprintf(
						/* translators: %s: Estimated hours until peak scan effectiveness. */
						__('~%s', 'helm'),
						(peakSeconds / 3600).toFixed(1)
				  );
	}

	return (
		<LogCard
			time={__('now', 'helm')}
			title={title}
			tone={tone}
			variant="active"
			status={status}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<SystemGrid columns={3} gap="sm">
					<SystemCell>
						<Readout
							label={__('DST', 'helm')}
							value={action.params.distance_ly}
							unit="ly"
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('CYC', 'helm')}
							value={progress?.cycle_number ?? '--'}
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Chance', 'helm')}
							value={chanceLabel}
							tone={tone}
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
				{progress && (
					<>
						<SystemGrid columns={3} gap="sm">
							<Readout
								label={__('Work', 'helm')}
								value={
									(progress.work_progress * 100).toFixed(1) +
									'%'
								}
								tone={tone}
								size="sm"
							/>
							<Readout
								label={__('Peak in', 'helm')}
								value={peakLabel}
								unit={
									typeof peakSeconds === 'number' &&
									peakSeconds > 0
										? __('HR', 'helm')
										: undefined
								}
								tone={tone}
								size="sm"
							/>
							<Readout
								label={__('PWR/CYC', 'helm')}
								value={formatScanPower(
									estimate?.power_cost ??
										progress.next_cycle_cost.power
								)}
								unit="MJ"
								tone="gold"
								size="sm"
							/>
						</SystemGrid>
					</>
				)}
				{inputs && powerMode && powerMode !== inputs.power_mode && (
					<span
						style={{
							fontSize: 11,
							color: 'var(--helm-ui-color-muted)',
						}}
					>
						{__('Power mode change applies next cycle.', 'helm')}
					</span>
				)}
				<ActiveScanProgress action={action} tone={tone} />
				{itinerary && (
					<RouteItinerary {...itinerary} className="helm-mt-2" />
				)}
			</div>
		</LogCard>
	);
}

function ActiveScanProgress({
	action,
	tone,
}: {
	action: ShipAction<'scan_route'> & { status: 'pending' | 'running' };
	tone: LcarsTone;
}) {
	const [remaining, setRemaining] = useState(() =>
		getRemainingSeconds(action.deferred_until)
	);

	useEffect(() => {
		if (!action.deferred_until) {
			return;
		}
		setRemaining(getRemainingSeconds(action.deferred_until));
		const interval = setInterval(() => {
			setRemaining(getRemainingSeconds(action.deferred_until!));
		}, 1000);
		return () => clearInterval(interval);
	}, [action.deferred_until]);

	const progress = action.result?.progress;
	const cycle = action.deferred_until
		? getProgressPercentage(progress?.cycle_seconds, remaining)
		: undefined;
	return (
		<>
			{progress && (
				<div style={{ display: 'grid', gap: 12 }}>
					<div>
						<div
							style={{
								marginBottom: 6,
								fontSize: 11,
								color: 'var(--helm-ui-color-lilac)',
							}}
						>
							{__('Work progress', 'helm')}
						</div>
						<ProgressBar
							value={progress.work_progress * 100}
							label={__(
								'Work toward peak scan effectiveness',
								'helm'
							)}
							tone={tone}
							size="sm"
						/>
					</div>
					{cycle !== undefined && (
						<div>
							<div
								style={{
									marginBottom: 6,
									fontSize: 11,
									color: 'var(--helm-ui-color-lilac)',
								}}
							>
								{__('Cycle progress', 'helm')}
							</div>
							<ProgressBar
								value={cycle}
								label={__('Current scan cycle', 'helm')}
								tone={tone}
								size="sm"
							/>
						</div>
					)}
				</div>
			)}
			{action.deferred_until && (
				<div
					className={`helm-flex helm-items-center helm-justify-between helm-gap-x-3 helm-tone--${tone}`}
				>
					<Countdown
						label={__('Next update', 'helm')}
						remaining={remaining === 0 ? '00:00' : remaining}
						tone={tone}
						active
						size="sm"
					/>
					<div className="helm-flex helm-items-center helm-justify-end helm-gap-x-2">
						<Button size="sm" variant="tertiary">
							{__('Cancel', 'helm')}
						</Button>
					</div>
				</div>
			)}
		</>
	);
}
