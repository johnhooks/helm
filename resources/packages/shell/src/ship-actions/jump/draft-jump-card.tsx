import { __ } from '@wordpress/i18n';
import type { KnownPathResult } from '@helm/datacore';
import {
	Button,
	LogCard,
	Readout,
	StatusBadge,
	SystemCell,
	SystemGrid,
} from '@helm/ui';
import type { DraftAction } from '@helm/actions';
import { getJumpTitle } from './utils';

interface DraftJumpCardProps {
	draft: DraftAction<'jump'>;
	targetName: string;
	routePath?: KnownPathResult;
	routeNodeNames?: string[];
	onCancel: () => void;
	onSubmit: () => void;
	isSubmitting: boolean;
}

export function DraftJumpCard({
	draft,
	targetName,
	routePath,
	routeNodeNames = [],
	onCancel,
	onSubmit,
	isSubmitting,
}: DraftJumpCardProps) {
	const tone = 'sky';
	const title = getJumpTitle(draft.type, targetName);
	const routeDistance = routePath?.totalDistance ?? '--';
	const pathLabel =
		routeNodeNames.length > 0
			? routeNodeNames.join(' → ')
			: draft.params.route.join(' → ');

	return (
		<LogCard
			time={__('draft', 'helm')}
			title={title}
			tone={tone}
			variant="draft"
			status={
				<StatusBadge tone="warning" size="sm">
					{__('Pending', 'helm')}
				</StatusBadge>
			}
			action={
				<div
					className={`helm-tone--${tone} helm-flex helm-items-center helm-justify-end helm-gap-x-2`}
				>
					<Button
						size="sm"
						variant="tertiary"
						onClick={onCancel}
						disabled={isSubmitting}
					>
						{__('Cancel', 'helm')}
					</Button>
					<Button
						size="sm"
						variant="primary"
						onClick={onSubmit}
						disabled={isSubmitting}
					>
						{__('Confirm Jump', 'helm')}
					</Button>
				</div>
			}
		>
			<SystemGrid columns={3} gap="sm">
				<SystemCell>
					<Readout
						label={__('Distance', 'helm')}
						value={routeDistance}
						unit={routePath ? 'ly' : undefined}
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
						label={__('Power', 'helm')}
						value="--"
						tone="gold"
						size="sm"
					/>
				</SystemCell>
			</SystemGrid>
			<div className={`helm-tone--${tone}`} style={{ marginTop: 8 }}>
				<strong>{__('Path', 'helm')}</strong>: {pathLabel}
			</div>
		</LogCard>
	);
}
