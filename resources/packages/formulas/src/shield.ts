export function shieldRegenRate(baseRate: number, priority: number): number {
	return baseRate * priority;
}

export function shieldDraw(baseDraw: number, priority: number): number {
	return baseDraw * priority;
}

export function shieldTimeToFull(capacity: number, regenRate: number): number {
	if (regenRate <= 0) {
		return Infinity;
	}
	return (capacity / regenRate) * 3600;
}
