import type { NavNode, StarNode } from '@helm/types';

export function createGraphReadKey(
	fromNodeId: number,
	targetNodeId: number
): string {
	return `${fromNodeId}:${targetNodeId}`;
}

export function getNodeName(node: StarNode | NavNode): string {
	if ('title' in node) {
		return node.title;
	}

	if (node.type === 'waypoint') {
		return `Waypoint #${node.id}`;
	}

	return `Node #${node.id}`;
}
