/**
 * Experience curves for pilot skills and component drift.
 *
 * Logarithmic with natural plateaus — rapid early gains, diminishing
 * returns, hard cap at the multiplier range ceiling. A max-skill pilot
 * is meaningfully better, never dramatically better.
 */

/**
 * Maps an action count to a 0→1 factor on a logarithmic curve.
 *
 * Shared by both component experience (lives on the hardware, dies with ship)
 * and pilot skills (lives on the player, survives ship loss).
 *
 * @param count - Number of completed actions (e.g. scans, jumps)
 * @param maxMeaningful - Count at which the curve effectively plateaus (~1.0)
 */
export function buffFactor(count: number, maxMeaningful = 5000): number {
	if (count <= 0) { return 0; }
	return Math.min(1.0, Math.log(1 + count) / Math.log(1 + maxMeaningful));
}

/**
 * Maps an action count to a multiplier within [minMult, maxMult].
 *
 * Used to derive pre-computed pilot skill multipliers from raw counters.
 * The counters live in PHP (helm_scans_completed, etc.) — this function
 * converts them into the multiplier values that flow through formulas.
 *
 * @param count - Number of completed actions
 * @param maxMeaningful - Count at which the curve plateaus
 * @param minMult - Multiplier for zero experience (default 1.0)
 * @param maxMult - Multiplier at full experience (default 1.25)
 */
export function skillMultiplier(
	count: number,
	maxMeaningful = 5000,
	minMult = 1.0,
	maxMult = 1.25,
): number {
	const factor = buffFactor(count, maxMeaningful);
	return minMult + factor * (maxMult - minMult);
}
