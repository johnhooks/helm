export function discoveryProbability(
	skill: number,
	efficiency: number,
	depth: number,
	hopDecayFactor: number,
): number {
	return Math.min(1.0, skill * efficiency * Math.pow(hopDecayFactor, depth));
}
