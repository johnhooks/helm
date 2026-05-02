import { __ } from '@wordpress/i18n';
import { LogCard, Readout, SystemCell, SystemGrid } from '@helm/ui';
import type { ShipAction } from '@helm/actions';
import { isFailed, isFulfilled } from '@helm/actions';
import { ActionStatusBadge } from '../action-status';
import { formatTime } from '../utils';
import { getJumpTitle } from './utils';

export function CompleteJumpCard({
	action,
	targetName,
}: {
	action: ShipAction<'jump'>;
	targetName: string;
}) {
	const tone = 'sky';
	const title = getJumpTitle(action.type, targetName);
	const status = <ActionStatusBadge status={action.status} />;
	const time = formatTime(action.created_at);

	if (isFailed(action)) {
		return (
			<LogCard
				time={time}
				title={title}
				tone={tone}
				variant="default"
				status={status}
				style={{ borderColor: 'var(--helm-ui-color-danger)' }}
			>
				<SystemGrid columns={3} gap="sm">
					<SystemCell>
						<Readout
							label={__('Duration', 'helm')}
							value={action.result.duration}
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
					<SystemCell>
						<Readout
							label={__('Cause', 'helm')}
							value={action.result.cause ?? __('Unknown', 'helm')}
							tone="orange"
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
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
							value={action.result.duration}
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Core Cost', 'helm')}
							value={action.result.core_cost}
							unit="%"
							tone="gold"
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
			</LogCard>
		);
	}

	return null;
}
