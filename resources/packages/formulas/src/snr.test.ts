import { describe, it, expect } from 'vitest';
import { snr, maskedSNR, integrationGain } from './snr';

describe('snr', () => {
	it('returns ratio of signal to noise', () => {
		expect(snr(10, 2)).toBe(5);
		expect(snr(1, 1)).toBe(1);
		expect(snr(3, 6)).toBe(0.5);
	});

	it('returns Infinity when noise is zero and signal is positive', () => {
		expect(snr(5, 0)).toBe(Infinity);
	});

	it('returns 0 when both signal and noise are zero', () => {
		expect(snr(0, 0)).toBe(0);
	});

	it('returns 0 when signal is zero', () => {
		expect(snr(0, 5)).toBe(0);
	});

	it('loud action in quiet system has high SNR', () => {
		// PNP scan (5.0) in an M-class system (0.3 noise)
		expect(snr(5.0, 0.3)).toBeCloseTo(16.67, 1);
	});

	it('quiet action in loud system has low SNR', () => {
		// Shield regen (0.2) in a busy O-class system (12.0 noise)
		expect(snr(0.2, 12.0)).toBeCloseTo(0.017, 2);
	});
});

describe('maskedSNR', () => {
	it('equals basic SNR when correlated noise is zero', () => {
		expect(maskedSNR(10, 2, 0)).toBe(snr(10, 2));
	});

	it('is lower than basic SNR when correlated noise is present', () => {
		const basic = snr(1.0, 1.0);
		const masked = maskedSNR(1.0, 1.0, 2.0);
		expect(masked).toBeLessThan(basic);
	});

	it('models the miner-in-belt scenario', () => {
		// Mining emission = 1.0, stellar noise = 1.0, belt masking = 3.0
		// The belt noise spectrally overlaps mining, making detection harder
		const result = maskedSNR(1.0, 1.0, 3.0);
		// 1.0 / (1.0 + 3.0) = 0.25
		expect(result).toBe(0.25);
	});

	it('returns Infinity when all noise is zero and signal is positive', () => {
		expect(maskedSNR(5, 0, 0)).toBe(Infinity);
	});

	it('returns 0 when signal is zero', () => {
		expect(maskedSNR(0, 1, 2)).toBe(0);
	});
});

describe('integrationGain', () => {
	it('returns instantSNR for a single sample', () => {
		expect(integrationGain(2.0, 1)).toBe(2.0);
	});

	it('improves by √N', () => {
		// 4 samples: 2.0 * √4 = 4.0
		expect(integrationGain(2.0, 4)).toBe(4.0);
		// 9 samples: 2.0 * √9 = 6.0
		expect(integrationGain(2.0, 9)).toBe(6.0);
	});

	it('doubling samples gives ~1.41x improvement, not 2x', () => {
		const base = integrationGain(1.0, 10);
		const doubled = integrationGain(1.0, 20);
		const ratio = doubled / base;
		expect(ratio).toBeCloseTo(Math.SQRT2, 5);
	});

	it('returns 0 for zero or negative sample count', () => {
		expect(integrationGain(2.0, 0)).toBe(0);
		expect(integrationGain(2.0, -1)).toBe(0);
	});

	it('models hours of passive belt observation', () => {
		// Weak instant SNR (0.25), 30-minute sample period, 6 hours of observation
		// sampleCount = (6 * 3600) / 1800 = 12
		const instant = 0.25;
		const samples = 12;
		const integrated = integrationGain(instant, samples);
		// 0.25 * √12 ≈ 0.866
		expect(integrated).toBeCloseTo(0.866, 2);
		// Still below passive detection threshold (4.0) — belt masking works
		expect(integrated).toBeLessThan(4.0);
	});
});
