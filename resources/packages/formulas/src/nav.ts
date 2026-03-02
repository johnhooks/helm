export const NAV_CONSTANTS = {
	MAX_RANGE: 7.0,
	DISTANCE_SCALE: 10.0,
	MAX_SCATTER: 0.1,
	ALGORITHM_VERSION: 1,
} as const;

/**
 * Compute the effective first-hop scan success chance.
 *
 * Combines the base chance (from sensor + effort), distance penalty
 * (exponential decay), and corridor difficulty (deterministic per node pair).
 * Result is clamped to [0.01, 0.99].
 */
export function firstHopChance(
	baseChance: number,
	distance: number,
	difficulty: number,
): number {
	const distancePenalty = Math.exp(-distance / NAV_CONSTANTS.DISTANCE_SCALE);
	const effective = baseChance * distancePenalty * (1.0 - difficulty * 0.3);
	return Math.max(0.01, Math.min(0.99, effective));
}

export function discoveryProbability(
	skill: number,
	efficiency: number,
	depth: number,
	hopDecayFactor: number,
	pilotSkill = 1.0,
): number {
	return Math.max(0.01, Math.min(0.95, skill * efficiency * Math.pow(hopDecayFactor, depth) * pilotSkill));
}
