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
	const completedLegs = action.result?.phases?.length ?? 0;

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
							label={__('Route Legs', 'helm')}
							value={action.params.route.length}
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Completed', 'helm')}
							value={completedLegs}
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
							label={__('Route Legs', 'helm')}
							value={action.params.route.length}
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Completed', 'helm')}
							value={completedLegs}
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Core Life', 'helm')}
							value={action.result.remaining_core_life}
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
