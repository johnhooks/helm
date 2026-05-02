import { __ } from '@wordpress/i18n';
import { StatusBadge } from '@helm/ui';
import type { ShipAction } from '@helm/actions';

export function ActionStatusBadge({
	status,
}: {
	status: ShipAction['status'];
}) {
	if (status === 'pending' || status === 'running') {
		return (
			<StatusBadge tone="info" size="sm" pulse>
				{__('In Progress', 'helm')}
			</StatusBadge>
		);
	}
	if (status === 'fulfilled') {
		return (
			<StatusBadge tone="success" size="sm">
				{__('Complete', 'helm')}
			</StatusBadge>
		);
	}
	if (status === 'partial') {
		return (
			<StatusBadge tone="warning" size="sm">
				{__('Partial', 'helm')}
			</StatusBadge>
		);
	}
	if (status === 'failed') {
		return (
			<StatusBadge tone="danger" size="sm">
				{__('Failed', 'helm')}
			</StatusBadge>
		);
	}
	return <></>;
}
