export function formatTime(iso: string): string {
	const date = new Date(iso);
	return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getRemainingSeconds(deferredUntil: string | null): number {
	if (!deferredUntil) {
		return 0;
	}
	const target = new Date(deferredUntil).getTime();
	return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

export function getProgressPercentage(
	durationSeconds: number | null | undefined,
	remainingSeconds: number
): number | undefined {
	if (!durationSeconds || durationSeconds <= 0) {
		return undefined;
	}

	const elapsedSeconds = durationSeconds - remainingSeconds;
	return Math.max(0, Math.min(100, (elapsedSeconds / durationSeconds) * 100));
}

export function getActionTitle(
	titles: Record<string, string>,
	fallback: string,
	type: string,
	targetName?: string
): string {
	const baseTitle = titles[type] ?? fallback;
	return targetName ? `${baseTitle} — ${targetName}` : baseTitle;
}
