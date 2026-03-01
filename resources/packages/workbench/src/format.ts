/**
 * Shared formatting helpers for CLI output.
 */

/**
 * Round to N decimal places.
 */
export function r(n: number, decimals: number = 4): number {
	if (!isFinite(n)) {
		return n;
	}
	const factor = Math.pow(10, decimals);
	return Math.round(n * factor) / factor;
}

/**
 * Format a number as a percentage string.
 */
export function pct(n: number, decimals: number = 1): string {
	return `${r(n * 100, decimals)}%`;
}
