import { __ } from '@wordpress/i18n';
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
