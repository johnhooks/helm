import { describe, it, expect } from 'vitest';
import { DEFAULT_DRIVE_ENVELOPES } from './types';
import {
	phaseEmission,
	envelopeEmission,
	envelopeAt,
	envelopeDuration,
	envelopeTimeSeries,
	envelopePeakPower,
} from './envelope';

const civilian = DEFAULT_DRIVE_ENVELOPES['dr-305'];
const industrial = DEFAULT_DRIVE_ENVELOPES['dr-505'];
const military = DEFAULT_DRIVE_ENVELOPES['dr-705'];

describe('phaseEmission', () => {
	it('returns 0 at t=0', () => {
		expect(phaseEmission(0, civilian.spool)).toBe(0);
	});

	it('returns peakPower at t=duration', () => {
		expect(
			phaseEmission(civilian.spool.duration, civilian.spool)
		).toBeCloseTo(1.2);
		expect(
			phaseEmission(military.spool.duration, military.spool)
		).toBeCloseTo(2.5);
	});

	it('clamps t to [0, duration]', () => {
		expect(phaseEmission(-5, civilian.spool)).toBe(0);
		expect(
			phaseEmission(civilian.spool.duration + 100, civilian.spool)
		).toBeCloseTo(1.2);
	});

	it('curve < 1 is front-loaded (military)', () => {
		// At 50% time, military (curve 0.5) should be > 50% of peak
		const halfDuration = military.spool.duration / 2;
		const midpoint = phaseEmission(halfDuration, military.spool);
		const linearMidpoint = military.spool.peakPower * 0.5;
		expect(midpoint).toBeGreaterThan(linearMidpoint);
	});

	it('curve > 1 is back-loaded (civilian)', () => {
		// At 50% time, civilian (curve 1.5) should be < 50% of peak
		const halfDuration = civilian.spool.duration / 2;
		const midpoint = phaseEmission(halfDuration, civilian.spool);
		const linearMidpoint = civilian.spool.peakPower * 0.5;
		expect(midpoint).toBeLessThan(linearMidpoint);
	});

	it('curve = 1 is linear', () => {
		// At 50% time, linear (curve 1.0) should be exactly 50% of peak
		const halfDuration = industrial.spool.duration / 2;
		const midpoint = phaseEmission(halfDuration, industrial.spool);
		expect(midpoint).toBeCloseTo(industrial.spool.peakPower * 0.5);
	});
});

describe('envelopeEmission', () => {
	it('spool rises from 0 to peak', () => {
		expect(envelopeEmission(0, 'spool', civilian)).toBe(0);
		expect(
			envelopeEmission(civilian.spool.duration, 'spool', civilian)
		).toBeCloseTo(1.2);
	});

	it('sustain is flat regardless of t', () => {
		expect(envelopeEmission(0, 'sustain', civilian)).toBe(1.0);
		expect(envelopeEmission(999, 'sustain', civilian)).toBe(1.0);
	});

	it('cooldown falls from peak to 0', () => {
		expect(envelopeEmission(0, 'cooldown', civilian)).toBeCloseTo(0.8);
		expect(
			envelopeEmission(civilian.cooldown.duration, 'cooldown', civilian)
		).toBeCloseTo(0);
	});

	it('military spool reaches peak at duration', () => {
		expect(
			envelopeEmission(military.spool.duration, 'spool', military)
		).toBeCloseTo(2.5);
	});

	it('military cooldown starts hot at 1.8', () => {
		expect(envelopeEmission(0, 'cooldown', military)).toBeCloseTo(1.8);
	});
});

describe('envelopeAt', () => {
	it('returns spool phase at elapsed=0', () => {
		const state = envelopeAt(0, civilian);
		expect(state.phase).toBe('spool');
		expect(state.phaseElapsed).toBe(0);
		expect(state.power).toBe(0);
	});

	it('returns spool phase mid-spool', () => {
		const midSpool = civilian.spool.duration / 2;
		const state = envelopeAt(midSpool, civilian);
		expect(state.phase).toBe('spool');
		expect(state.phaseElapsed).toBeCloseTo(midSpool);
		expect(state.power).toBeGreaterThan(0);
		expect(state.power).toBeLessThan(civilian.spool.peakPower);
	});

	it('reaches spool peak at spool boundary', () => {
		const state = envelopeAt(civilian.spool.duration, civilian);
		expect(state.phase).toBe('spool');
		expect(state.power).toBeCloseTo(civilian.spool.peakPower);
	});

	it('transitions to sustain after spool', () => {
		const state = envelopeAt(civilian.spool.duration + 0.5, civilian);
		expect(state.phase).toBe('sustain');
		expect(state.phaseElapsed).toBeCloseTo(0.5);
		expect(state.power).toBe(civilian.sustain.peakPower);
	});

	it('transitions to cooldown after sustain', () => {
		const cooldownStart =
			civilian.spool.duration + civilian.sustain.duration;
		const state = envelopeAt(cooldownStart + 1, civilian);
		expect(state.phase).toBe('cooldown');
		expect(state.phaseElapsed).toBeCloseTo(1);
		expect(state.power).toBeGreaterThan(0);
		expect(state.power).toBeLessThan(civilian.cooldown.peakPower);
	});

	it('cooldown reaches 0 at end', () => {
		const total = envelopeDuration(civilian);
		const state = envelopeAt(total, civilian);
		expect(state.phase).toBe('cooldown');
		expect(state.power).toBeCloseTo(0, 1);
	});

	it('returns idle after envelope completes', () => {
		const total = envelopeDuration(civilian);
		const state = envelopeAt(total + 1, civilian);
		expect(state.phase).toBe('idle');
		expect(state.power).toBe(0);
	});

	it('returns idle for negative elapsed', () => {
		const state = envelopeAt(-1, civilian);
		expect(state.phase).toBe('idle');
		expect(state.power).toBe(0);
	});

	it('military envelope plays out correctly at key timestamps', () => {
		const spoolEnd = military.spool.duration;
		const sustainEnd = spoolEnd + military.sustain.duration;
		const total = envelopeDuration(military);

		const t0 = envelopeAt(0, military);
		expect(t0.phase).toBe('spool');
		expect(t0.power).toBe(0);

		// 25% through spool — military is front-loaded (curve 0.5)
		const t25pct = envelopeAt(spoolEnd * 0.25, military);
		expect(t25pct.phase).toBe('spool');
		expect(t25pct.power).toBeGreaterThanOrEqual(
			military.spool.peakPower * 0.5
		);

		// End of spool
		const tSpoolEnd = envelopeAt(spoolEnd, military);
		expect(tSpoolEnd.phase).toBe('spool');
		expect(tSpoolEnd.power).toBeCloseTo(2.5);

		// Sustain
		const tSustainMid = envelopeAt(spoolEnd + 0.5, military);
		expect(tSustainMid.phase).toBe('sustain');
		expect(tSustainMid.power).toBe(0.8);

		// Cooldown start
		const tCooldownStart = envelopeAt(sustainEnd + 0.1, military);
		expect(tCooldownStart.phase).toBe('cooldown');
		expect(tCooldownStart.power).toBeCloseTo(
			military.cooldown.peakPower,
			0
		);

		// Idle after total
		const tIdle = envelopeAt(total + 1, military);
		expect(tIdle.phase).toBe('idle');
		expect(tIdle.power).toBe(0);
	});

	it('produces same values as direct envelopeEmission calls', () => {
		// Verify envelopeAt agrees with the lower-level API
		const elapsed = civilian.spool.duration / 2;
		const state = envelopeAt(elapsed, civilian);
		const direct = envelopeEmission(elapsed, 'spool', civilian);
		expect(state.power).toBe(direct);
	});

	it('is a pure function of elapsed time (deterministic)', () => {
		// Same elapsed = same result, always
		const a = envelopeAt(25.7, industrial);
		const b = envelopeAt(25.7, industrial);
		expect(a.phase).toBe(b.phase);
		expect(a.power).toBe(b.power);
		expect(a.phaseElapsed).toBe(b.phaseElapsed);
	});
});

describe('envelopeDuration', () => {
	it('returns total of all three phases', () => {
		// civilian: 180+1+120 = 301, industrial: 240+1+180 = 421, military: 120+1+150 = 271
		expect(envelopeDuration(civilian)).toBe(301);
		expect(envelopeDuration(industrial)).toBe(421);
		expect(envelopeDuration(military)).toBe(271);
	});
});

describe('envelopeTimeSeries', () => {
	it('returns the requested number of samples', () => {
		const series = envelopeTimeSeries(civilian, 20);
		expect(series).toHaveLength(20);
	});

	it('starts at t=0 and ends at total duration', () => {
		const series = envelopeTimeSeries(civilian, 10);
		expect(series[0].t).toBe(0);
		expect(series[series.length - 1].t).toBeCloseTo(
			envelopeDuration(civilian)
		);
	});

	it('transitions through all three phases', () => {
		// Need high step count — sustain is only 1s wide in the envelope
		const series = envelopeTimeSeries(civilian, 500);
		const phases = new Set(series.map((s) => s.phase));
		expect(phases).toContain('spool');
		expect(phases).toContain('sustain');
		expect(phases).toContain('cooldown');
	});

	it('starts at 0 power during spool', () => {
		const series = envelopeTimeSeries(civilian, 50);
		expect(series[0].power).toBe(0);
	});

	it('ends near 0 power during cooldown', () => {
		const series = envelopeTimeSeries(civilian, 50);
		expect(series[series.length - 1].power).toBeCloseTo(0, 1);
	});

	it('uses envelopeAt internally for each sample', () => {
		const series = envelopeTimeSeries(military, 30);
		const peak = envelopePeakPower(military);
		for (const sample of series) {
			expect(sample.power).toBeGreaterThanOrEqual(0);
			expect(sample.power).toBeLessThanOrEqual(peak);
			expect(['spool', 'sustain', 'cooldown']).toContain(sample.phase);
		}
	});
});

describe('envelopePeakPower', () => {
	it('returns the maximum across all phases', () => {
		expect(envelopePeakPower(military)).toBe(2.5); // spool peak
		expect(envelopePeakPower(civilian)).toBe(1.2); // spool peak
		expect(envelopePeakPower(industrial)).toBe(1.5); // spool peak
	});

	it('military has highest peak (most detectable burst)', () => {
		expect(envelopePeakPower(military)).toBeGreaterThan(
			envelopePeakPower(industrial)
		);
		expect(envelopePeakPower(industrial)).toBeGreaterThan(
			envelopePeakPower(civilian)
		);
	});
});

describe('drive personality differences', () => {
	it('military reaches 50% of spool peak faster than civilian', () => {
		// Compare at 25% of their respective spool durations
		const milState = envelopeAt(military.spool.duration * 0.25, military);
		const civState = envelopeAt(civilian.spool.duration * 0.25, civilian);

		const milFraction = milState.power / military.spool.peakPower;
		const civFraction = civState.power / civilian.spool.peakPower;

		expect(milFraction).toBeGreaterThan(civFraction);
	});

	it('military sustain is quieter than civilian (stealthy at cruise)', () => {
		expect(military.sustain.peakPower).toBeLessThan(
			civilian.sustain.peakPower
		);
		expect(industrial.sustain.peakPower).toBeGreaterThan(
			civilian.sustain.peakPower
		);
	});
});

describe('timestamp-based usage pattern', () => {
	it('simulates the engine pattern: startedAt + now → state', () => {
		const startedAt = 1709164800;
		const spoolEnd = military.spool.duration;
		const sustainEnd = spoolEnd + military.sustain.duration;
		const total = envelopeDuration(military);

		// During spool
		const atSpool = envelopeAt(startedAt + 10 - startedAt, military);
		expect(atSpool.phase).toBe('spool');

		// During sustain
		const atSustain = envelopeAt(
			startedAt + spoolEnd + 0.5 - startedAt,
			military
		);
		expect(atSustain.phase).toBe('sustain');

		// During cooldown
		const atCooldown = envelopeAt(
			startedAt + sustainEnd + 5 - startedAt,
			military
		);
		expect(atCooldown.phase).toBe('cooldown');

		// Idle after total
		const atIdle = envelopeAt(startedAt + total + 5 - startedAt, military);
		expect(atIdle.phase).toBe('idle');
	});

	it('multiple waveforms evaluated at the same instant are phase-coherent', () => {
		const total = envelopeDuration(military);
		const now = 1709165000;
		const driveA_startedAt = now - 10; // 10s ago → spool
		const driveB_startedAt = now - (total + 5); // past total → idle

		const stateA = envelopeAt(now - driveA_startedAt, military);
		const stateB = envelopeAt(now - driveB_startedAt, military);

		// A is 10s into spool
		expect(stateA.phase).toBe('spool');
		// B is past total duration, so idle
		expect(stateB.phase).toBe('idle');
	});
});
