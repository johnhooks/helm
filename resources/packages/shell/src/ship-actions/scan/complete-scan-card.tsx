import { __ } from '@wordpress/i18n';
import {
	Disclosure,
	LogCard,
	Readout,
	RouteItinerary,
	SystemCell,
	SystemGrid,
} from '@helm/ui';
import type { RouteItineraryProps } from '@helm/ui';
import type { ShipAction } from '@helm/actions';
import { getActionError, isFailed, isFulfilled } from '@helm/actions';
import { ActionStatusBadge } from '../action-status';
import { formatTime } from '../utils';
import { getScanTitle, getScanWaypointCount } from './utils';

export function CompleteScanCard({
	action,
	targetName,
	itinerary,
}: {
	action: ShipAction<'scan_route'>;
	targetName: string;
	itinerary?: RouteItineraryProps;
}) {
	const tone = 'lilac';
	const title = getScanTitle(action.type, targetName);
	const status = <ActionStatusBadge status={action.status} />;
	const time = formatTime(action.created_at);
	const actionError = getActionError(action);
	const error = {
		code: actionError?.message || __('Unknown', 'helm'),
		detail: actionError?.detail,
		causes: actionError?.causes
			.map((cause) => cause.detail)
			.filter((detail): detail is string => detail !== ''),
	};

	if (isFailed(action)) {
		return (
			<LogCard
				time={time}
				title={title}
				tone={tone}
				variant="default"
				status={status}
				error={error}
				style={{ borderColor: 'var(--helm-ui-color-danger)' }}
			>
				<SystemGrid columns={2} gap="sm">
					<SystemCell>
						<Readout
							label={__('Duration', 'helm')}
							value="--"
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Distance', 'helm')}
							value={action.params.distance_ly}
							unit="ly"
							tone={tone}
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
				{action.result?.progress?.stop_message && (
					<p className="helm-mt-2">
						{action.result.progress.stop_message}
					</p>
				)}
				{itinerary && (
					<Disclosure
						className="helm-mt-4"
						label={__('Discoveries', 'helm')}
					>
						<RouteItinerary {...itinerary} />
					</Disclosure>
				)}
			</LogCard>
		);
	}

	if (isFulfilled(action)) {
		return (
			<LogCard
				time={time}
				title={title}
				tone={tone}
				variant="default"
				status={status}
			>
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
							label={__('Duration', 'helm')}
							value="--"
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Waypoints', 'helm')}
							value={getScanWaypointCount(action) ?? 0}
							tone={tone}
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
				{action.result.progress?.stop_message && (
					<p className="helm-mt-2">
						{action.result.progress.stop_message}
					</p>
				)}
				{itinerary && (
					<Disclosure
						className="helm-mt-4"
						label={__('Discoveries', 'helm')}
					>
						<RouteItinerary {...itinerary} />
					</Disclosure>
				)}
			</LogCard>
		);
	}

	return null;
}
