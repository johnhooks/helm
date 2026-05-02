import { __ } from '@wordpress/i18n';
import {
	Button,
	LogCard,
	Readout,
	StatusBadge,
	SystemCell,
	SystemGrid,
} from '@helm/ui';
import type { DraftAction } from '@helm/actions';
import { getScanTitle } from './utils';

interface DraftScanCardProps {
	draft: DraftAction<'scan_route'>;
	targetName: string;
	onCancel: () => void;
	onSubmit: () => void;
	isSubmitting: boolean;
}

export function DraftScanCard({
	draft,
	targetName,
	onCancel,
	onSubmit,
	isSubmitting,
}: DraftScanCardProps) {
	const tone = 'lilac';
	const title = getScanTitle(draft.type, targetName);

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
						{__('Begin Scan', 'helm')}
					</Button>
				</div>
			}
		>
			<SystemGrid columns={3} gap="sm">
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
						value={draft.params.distance_ly}
						unit="ly"
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
		</LogCard>
	);
}
