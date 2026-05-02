/**
 * Signal-to-noise ratio — the core DSP quantity.
 *
 * SNR answers one question: how much does a target signal stand out from
 * the background noise? Every detection decision in the game flows from SNR.
 *
 * High SNR → the signal is obvious. A PNP scan in a quiet M-class system
 * lights up every sensor in the region.
 *
 * Low SNR → the signal is buried. A miner in a dense asteroid belt is
 * indistinguishable from the belt's natural emissions.
 *
 * Three flavors of SNR for three situations:
 * - Basic SNR: signal vs uncorrelated noise. The general case.
 * - Masked SNR: signal vs noise that spectrally overlaps. Harder to reject.
 *   The miner-in-belt scenario, the salvager-during-siege scenario.
 * - Integrated SNR: SNR improved by accumulating samples over time.
 *   The patient observer's advantage. Diminishing returns (√N).
 */

/**
 * Basic signal-to-noise ratio.
 *
 * The fundamental quantity. If the noise is zero, returns Infinity —
 * a signal in perfect silence is infinitely detectable (the math is
 * correct; the sigmoid in detection.ts will clamp this to ~100%).
 *
 * @param signalPower - Received power of the target signal
 * @param noisePower - Total noise power at the receiver
 */
export function snr(signalPower: number, noisePower: number): number {
	if (noisePower <= 0) {
		return signalPower > 0 ? Infinity : 0;
	}
	return signalPower / noisePower;
}

/**
 * Effective SNR when target emissions spectrally overlap with a noise source.
 *
 * Correlated noise is harder to reject than random noise because it looks
 * like the signal. Mining emissions in an asteroid belt share spectral
 * characteristics with the belt's natural emissions — thermal signatures,
 * metallic reflections, EM pulses. The sensor can't cleanly separate them.
 *
 * The correlated noise adds to the denominator alongside the uncorrelated
 * noise floor, producing a lower effective SNR than basic snr() would.
 *
 * @param signalPower - Received power of the target signal
 * @param noisePower - Uncorrelated noise power (from noiseFloor())
 * @param correlatedNoise - Noise that spectrally overlaps the target signal
 */
export function maskedSNR(
	signalPower: number,
	noisePower: number,
	correlatedNoise: number
): number {
	const totalNoise = noisePower + correlatedNoise;
	if (totalNoise <= 0) {
		return signalPower > 0 ? Infinity : 0;
	}
	return signalPower / totalNoise;
}

/**
 * Passive observation improvement over time.
 *
 * Integration is the passive detector's main tool. By accumulating samples
 * of a weak signal, noise averages out while the consistent signal builds.
 * The improvement follows √N — the square root of the number of samples.
 *
 * This means doubling observation time gives ~1.4x improvement, not 2x.
 * Diminishing returns that make patience valuable but not infinitely so.
 * There's always a point where "scan longer" stops helping and you need
 * a better sensor or a closer approach.
 *
 * @param instantSNR - SNR from a single sample
 * @param sampleCount - Number of independent samples accumulated
 */
export function integrationGain(
	instantSNR: number,
	sampleCount: number
): number {
	if (sampleCount <= 0) {
		return 0;
	}
	return instantSNR * Math.sqrt(sampleCount);
}
