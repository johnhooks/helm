import { DEFAULT_DSP_CONSTANTS } from './types';

/**
 * Noise floor formulas — what's the EM environment in this system?
 *
 * The noise floor is the denominator of every SNR calculation. It represents
 * the total electromagnetic energy a sensor has to filter through to find
 * a target signal. Higher noise floor = harder to detect anything.
 *
 * Sources of noise (all additive):
 * - Stellar baseline: hotter stars radiate more EM energy. An O-type system
 *   is electromagnetically violent. A brown dwarf system is nearly silent.
 * - Ship emissions: every active ship contributes. 10 miners = 10x mining noise.
 * - Belt noise: asteroid belts produce thermal, reflective, and collision noise.
 *   Scales with belt density — rich belts are louder.
 * - ECM: intentional broadband noise injection. The electronic warfare contribution.
 * - Random events: ion storms, solar flares — temporary spikes that degrade
 *   detection for everyone.
 *
 * Ship emissions combine as RMS (root-sum-of-squares): √Σ(E²), then
 * attenuated by shipNoiseFactor (default 0.3). This models spectral
 * filtering, spatial separation, and matched filter rejection — your
 * sensor doesn't blindly sum every EM source. 100 miners at 1.0 each
 * produce 0.3 × √100 = 3.0 noise, not 100.
 *
 * Other noise sources (belt, ECM, random) add linearly because they
 * represent specific, coherent environmental effects.
 */

/**
 * Baseline noise from stellar radiation.
 *
 * Uses a simple spectral class mapping — O/B stars are EM-loud, M/K stars
 * are quiet. The modifier captures local conditions (nebula, binary system,
 * proximity to pulsar, etc).
 *
 * The scale is relative: 1.0 = a quiet G-class system (Sol-like).
 *
 * @param stellarClass - OBAFGKM spectral class as a single character
 * @param modifier - Multiplier for local conditions (default 1.0)
 */
export function stellarNoise(
	stellarClass: string,
	modifier: number = 1.0
): number {
	const baseLevels: Record<string, number> = {
		O: 8.0, // Blue supergiant — electromagnetically violent
		B: 5.0, // Hot blue — very loud
		A: 3.0, // White — moderate-high
		F: 1.8, // Yellow-white — above average
		G: 1.0, // Sun-like — the reference level
		K: 0.6, // Orange — quieter
		M: 0.3, // Red dwarf — nearly silent
	};

	const base = baseLevels[stellarClass.toUpperCase()] ?? 1.0;
	return base * modifier;
}

/**
 * Total system noise floor.
 *
 * Sums all noise contributions into a single power value. This is the
 * denominator in every SNR calculation — the higher this number, the
 * harder it is to detect any individual signal.
 *
 * The shipEmissions array contains the emission power of every active
 * ship in the system (including the detecting ship's own emissions,
 * which the engine should include for self-interference modeling).
 *
 * Ship noise is attenuated by shipNoiseFactor — your sensor's spectral
 * filtering rejects most of the broadband ship emissions. This prevents
 * busy systems from becoming brick walls.
 *
 * @param baseline - Stellar noise (from stellarNoise())
 * @param shipEmissions - Emission power from each active ship in the system
 * @param beltNoise - Aggregate noise from asteroid belts (default 0)
 * @param ecmNoise - Intentional ECM noise injection (default 0)
 * @param randomNoise - Transient environmental noise: storms, flares (default 0)
 * @param shipNoiseFactor - Attenuation for ship emissions (default from DSP constants)
 */
export function noiseFloor(
	baseline: number,
	shipEmissions: number[],
	beltNoise: number = 0,
	ecmNoise: number = 0,
	randomNoise: number = 0,
	shipNoiseFactor: number = DEFAULT_DSP_CONSTANTS.shipNoiseFactor
): number {
	const totalShipNoise =
		shipNoiseFactor *
		Math.sqrt(shipEmissions.reduce((sum, e) => sum + e * e, 0));
	return baseline + totalShipNoise + beltNoise + ecmNoise + randomNoise;
}
