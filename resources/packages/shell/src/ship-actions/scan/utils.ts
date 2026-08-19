import { __ } from '@wordpress/i18n';
import type { ShipAction } from '@helm/actions';
import type { NavNode, StarNode } from '@helm/types';
import { getActionTitle } from '../utils';

const SCAN_TITLE: Record<string, string> = {
	scan_route: __('Route Scan', 'helm'),
};

export function getScanTitle(type: string, targetName?: string): string {
	return getActionTitle(SCAN_TITLE, __('Scan', 'helm'), type, targetName);
}

export function getScanTargetName(node: StarNode | NavNode): string {
	if ('title' in node) {
		return node.title;
	}

	return `Node #${node.id}`;
}

export function getScanWaypointCount(
	action: ShipAction<'scan_route'>
): number | undefined {
	const result = action.result;
	const origin = action.params.from_node_id ?? action.params.source_node_id;
	return result?.discovered_node_ids?.filter(
		(id) => id !== origin && id !== action.params.target_node_id
	).length;
}
