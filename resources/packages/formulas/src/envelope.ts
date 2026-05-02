/**
 * Drive envelope formulas — timestamp-based emission over a drive lifecycle.
 *
 * Helm is timestamp-based. The engine stores when an action started. At any
 * future moment, elapsed = now - startedAt determines the exact state. No
 * ticks, no simulation loops. The envelope is a pure function of elapsed time.
 *
 * The primary API is `envelopeAt(elapsed, envelope)`. Give it seconds since
 * the drive started spooling. It returns the current phase and instantaneous
 * emission power. Every other function builds on this.
 *
 * The power curve model uses exponentiation to create different envelope
 * personalities:
 * - curve < 1: front-loaded (military — slams to peak fast)
 * - curve = 1: linear ramp
 * - curve > 1: back-loaded (civilian — gentle warmup)
 */

import type { EnvelopePhaseShape, DriveEnvelope } from './types';

/**
 * Result of evaluating an envelope at a point in time.
 */
export interface EnvelopeState {
	phase: 'spool' | 'sustain' | 'cooldown' | 'idle';
	phaseElapsed: number;
	power: number;
}

/**
 * Instantaneous power within a single envelope phase (rising curve).
 *
 * Power curve: peakPower * (t / duration) ^ curve
 * Time is clamped to [0, duration].
 *
 * @param t - Time in seconds within the phase
 * @param shape - Phase shape parameters
 */
export function phaseEmission(t: number, shape: EnvelopePhaseShape): number {
	const clamped = Math.max(0, Math.min(t, shape.duration));
	const progress = shape.duration > 0 ? clamped / shape.duration : 1;
	return shape.peakPower * Math.pow(progress, shape.curve);
}

/**
 * Emission power at time t within a named envelope phase.
 *
 * Low-level building block. Prefer `envelopeAt()` which determines the
 * phase automatically from elapsed time.
 *
 * - Spool: rising power curve (attack)
 * - Sustain: flat at sustain.peakPower (ignores t)
 * - Cooldown: falling power curve — peakPower * (1 - t/duration) ^ curve
 *
 * @param t - Time in seconds within the phase
 * @param phase - Which phase of the envelope
 * @param envelope - The full drive envelope
 */
export function envelopeEmission(
	t: number,
	phase: 'spool' | 'sustain' | 'cooldown',
	envelope: DriveEnvelope
): number {
	switch (phase) {
		case 'spool':
			return phaseEmission(t, envelope.spool);

		case 'sustain':
			return envelope.sustain.peakPower;

		case 'cooldown': {
			const shape = envelope.cooldown;
			const clamped = Math.max(0, Math.min(t, shape.duration));
			const progress = shape.duration > 0 ? clamped / shape.duration : 1;
			return shape.peakPower * Math.pow(1 - progress, shape.curve);
		}
	}
}

/**
 * Total envelope duration across all three phases.
 *
 * @param envelope - The drive envelope
 */
export function envelopeDuration(envelope: DriveEnvelope): number {
	return (
		envelope.spool.duration +
		envelope.sustain.duration +
		envelope.cooldown.duration
	);
}

/**
 * Evaluate the drive envelope at a point in time.
 *
 * This is the primary API. The engine stores `startedAt` when a drive
 * begins spooling. At any timestamp, compute `elapsed = now - startedAt`
 * and call this function. It determines the phase, computes the
 * instantaneous emission power, and returns both.
 *
 * After the envelope completes (elapsed > total duration), the drive
 * is idle — phase='idle', power=0.
 *
 * @param elapsed - Seconds since the drive started spooling
 * @param envelope - The drive envelope
 */
export function envelopeAt(
	elapsed: number,
	envelope: DriveEnvelope
): EnvelopeState {
	if (elapsed < 0) {
		return { phase: 'idle', phaseElapsed: 0, power: 0 };
	}

	const spoolEnd = envelope.spool.duration;
	const sustainEnd = spoolEnd + envelope.sustain.duration;
	const cooldownEnd = sustainEnd + envelope.cooldown.duration;

	if (elapsed <= spoolEnd) {
		return {
			phase: 'spool',
			phaseElapsed: elapsed,
			power: envelopeEmission(elapsed, 'spool', envelope),
		};
	}

	if (elapsed <= sustainEnd) {
		return {
			phase: 'sustain',
			phaseElapsed: elapsed - spoolEnd,
			power: envelopeEmission(elapsed - spoolEnd, 'sustain', envelope),
		};
	}

	if (elapsed <= cooldownEnd) {
		return {
			phase: 'cooldown',
			phaseElapsed: elapsed - sustainEnd,
			power: envelopeEmission(elapsed - sustainEnd, 'cooldown', envelope),
		};
	}

	// Past the envelope — drive is idle
	return { phase: 'idle', phaseElapsed: elapsed - cooldownEnd, power: 0 };
}

/**
 * Generate a full spool->sustain->cooldown time series.
 *
 * Uses `envelopeAt()` internally — each sample is a timestamp evaluation.
 * Returns evenly-spaced samples across the total envelope duration.
 *
 * @param envelope - The drive envelope to sample
 * @param steps - Number of samples to generate
 */
export function envelopeTimeSeries(
	envelope: DriveEnvelope,
	steps: number
): Array<{ t: number; phase: string; power: number }> {
	const totalDuration = envelopeDuration(envelope);

	const result: Array<{ t: number; phase: string; power: number }> = [];

	for (let i = 0; i < steps; i++) {
		const t = (i / (steps - 1)) * totalDuration;
		const state = envelopeAt(t, envelope);

		result.push({
			t: Math.round(t * 1000) / 1000,
			phase: state.phase,
			power: state.power,
		});
	}

	return result;
}

/**
 * Maximum emission power across all phases of an envelope.
 *
 * Useful for worst-case detectability analysis.
 *
 * @param envelope - The drive envelope to analyze
 */
export function envelopePeakPower(envelope: DriveEnvelope): number {
	return Math.max(
		envelope.spool.peakPower,
		envelope.sustain.peakPower,
		envelope.cooldown.peakPower
	);
}
