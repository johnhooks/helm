export function createGraphReadKey(
	fromNodeId: number,
	targetNodeId: number
): string {
	return `${fromNodeId}:${targetNodeId}`;
}
