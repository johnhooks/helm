export function createNavigationEdgeKey(
	sourceNodeId: number,
	targetNodeId: number
): string {
	return `${sourceNodeId}:${targetNodeId}`;
}
