export interface Rng {
	next: () => number;
	nextInt: (max: number) => number;
}

/**
 * Seeded deterministic RNG using mulberry32.
 */
export function createRng(seed: number): Rng {
	// eslint-disable-next-line no-bitwise
	let s = seed | 0;

	function mulberry32(): number {
		/* eslint-disable no-bitwise */
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		/* eslint-enable no-bitwise */
	}

	return {
		next: () => mulberry32(),
		nextInt(max) {
			return Math.floor(mulberry32() * max);
		},
	};
}
