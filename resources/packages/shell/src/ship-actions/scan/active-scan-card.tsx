import { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Countdown,
	LogCard,
	Readout,
	SystemCell,
	SystemGrid,
	RouteItinerary,
} from '@helm/ui';
import type { LcarsTone, RouteItineraryProps } from '@helm/ui';
import type { ShipAction } from '@helm/actions';
import { isActive } from '@helm/actions';
import { ActionStatusBadge } from '../action-status';
import { getRemainingSeconds } from '../utils';
import { getScanTitle } from './utils';

export function ActiveScanCard({
	action,
	targetName,
	itinerary,
}: {
	action: ShipAction<'scan_route'>;
	targetName: string;
	itinerary?: RouteItineraryProps;
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
							label={__('Distance', 'helm')}
							value={action.params.distance_ly}
							unit="ly"
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Cycle', 'helm')}
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

	return (
		<>
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
