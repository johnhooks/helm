import { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Countdown,
	LogCard,
	Readout,
	SystemCell,
	SystemGrid,
} from '@helm/ui';
import type { LcarsTone } from '@helm/ui';
import type { ShipAction } from '@helm/actions';
import { isActive } from '@helm/actions';
import { ActionStatusBadge } from '../action-status';
import { getRemainingSeconds } from '../utils';
import { getJumpTitle } from './utils';

export function ActiveJumpCard({
	action,
	targetName,
}: {
	action: ShipAction<'jump'>;
	targetName: string;
}) {
	const tone = 'sky';

	if (!isActive(action)) {
		return null;
	}

	const result = action.result;
	const title = getJumpTitle(action.type, targetName);
	const status = <ActionStatusBadge status={action.status} />;

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
							label={__('Duration', 'helm')}
							value={result?.duration ?? '--'}
							tone={tone}
							size="sm"
						/>
					</SystemCell>
					<SystemCell>
						<Readout
							label={__('Core Cost', 'helm')}
							value={result?.core_cost ?? '--'}
							unit={
								result?.core_cost !== undefined
									? '%'
									: undefined
							}
							tone="gold"
							size="sm"
						/>
					</SystemCell>
				</SystemGrid>
				<ActiveJumpCountdown action={action} tone={tone} />
			</div>
		</LogCard>
	);
}

function ActiveJumpCountdown({
	action,
	tone,
}: {
	action: ShipAction<'jump'> & { status: 'pending' | 'running' };
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

	if (!action.deferred_until) {
		return null;
	}

	return (
		<div
			className={`helm-flex helm-items-center helm-justify-between helm-gap-x-3 helm-tone--${tone}`}
		>
			<Countdown
				label={__('Remaining', 'helm')}
				remaining={remaining}
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
	);
}
