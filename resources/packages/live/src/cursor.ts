let cursor = 0;

export function getBroadcastCursor(): number {
	return cursor;
}

export function setBroadcastCursor(nextCursor: number): void {
	cursor = Math.max(cursor, nextCursor);
}

export function advanceBroadcastCursorFromEvents(
	events: { id: number }[]
): number {
	const nextCursor = events.reduce(
		(max, event) => Math.max(max, event.id),
		cursor
	);
	setBroadcastCursor(nextCursor);
	return cursor;
}

export function resetBroadcastCursor(): void {
	cursor = 0;
}
