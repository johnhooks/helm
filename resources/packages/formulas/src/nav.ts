export function discoveryProbability(
	skill: number,
	efficiency: number,
	depth: number,
	hopDecayFactor: number,
	pilotSkill = 1.0,
): number {
	return Math.min(1.0, skill * efficiency * Math.pow(hopDecayFactor, depth) * pilotSkill);
}
