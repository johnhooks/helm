import { __ } from '@wordpress/i18n';
import type { NavNode, StarNode } from '@helm/types';
import { getActionTitle } from '../utils';

const JUMP_TITLE: Record<string, string> = {
	jump: __('Jump', 'helm'),
};

export function getJumpTitle(type: string, targetName?: string): string {
	return getActionTitle(JUMP_TITLE, __('Jump', 'helm'), type, targetName);
}

export function getFallbackJumpTargetName(nodeId: number): string {
	return `Waypoint #${nodeId}`;
}

export function getJumpTargetName(node: StarNode | NavNode): string {
	if ('title' in node) {
		return node.title;
	}

	if (node.type === 'waypoint') {
		return getFallbackJumpTargetName(node.id);
	}

	return `Node #${node.id}`;
}
