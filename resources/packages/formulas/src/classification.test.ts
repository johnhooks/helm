import { describe, it, expect } from 'vitest';
import { DEFAULT_TIER_THRESHOLDS } from './types';
import { informationTier, adjustedThresholds } from './classification';

describe('informationTier', () => {
	it('returns null below anomaly threshold', () => {
		expect(informationTier(0.0)).toBeNull();
		expect(informationTier(0.14)).toBeNull();
	});

	it('returns anomaly at low confidence', () => {
		expect(informationTier(0.15)).toBe('anomaly');
		expect(informationTier(0.3)).toBe('anomaly');
		expect(informationTier(0.39)).toBe('anomaly');
	});

	it('returns class at moderate confidence', () => {
		expect(informationTier(0.4)).toBe('class');
		expect(informationTier(0.5)).toBe('class');
		expect(informationTier(0.64)).toBe('class');
	});

	it('returns type at good confidence', () => {
		expect(informationTier(0.65)).toBe('type');
		expect(informationTier(0.75)).toBe('type');
		expect(informationTier(0.84)).toBe('type');
	});

	it('returns analysis at high confidence', () => {
		expect(informationTier(0.85)).toBe('analysis');
		expect(informationTier(0.95)).toBe('analysis');
		expect(informationTier(1.0)).toBe('analysis');
	});

	it('uses custom thresholds', () => {
		const custom = { anomaly: 0.1, class: 0.3, type: 0.5, analysis: 0.7 };
		expect(informationTier(0.09, custom)).toBeNull();
		expect(informationTier(0.1, custom)).toBe('anomaly');
		expect(informationTier(0.3, custom)).toBe('class');
		expect(informationTier(0.5, custom)).toBe('type');
		expect(informationTier(0.7, custom)).toBe('analysis');
	});
});

describe('adjustedThresholds', () => {
	it('returns defaults with no bonuses', () => {
		const result = adjustedThresholds();
		expect(result).toEqual(DEFAULT_TIER_THRESHOLDS);
	});

	it('equipment bonus shifts all thresholds down', () => {
		const result = adjustedThresholds(DEFAULT_TIER_THRESHOLDS, 0.05);
		expect(result.anomaly).toBeCloseTo(0.1);
		expect(result.class).toBeCloseTo(0.35);
		expect(result.type).toBeCloseTo(0.6);
		expect(result.analysis).toBeCloseTo(0.8);
	});

	it('experience bonus shifts all thresholds down', () => {
		const result = adjustedThresholds(DEFAULT_TIER_THRESHOLDS, 0, 0.03);
		expect(result.anomaly).toBeCloseTo(0.12);
		expect(result.class).toBeCloseTo(0.37);
		expect(result.type).toBeCloseTo(0.62);
		expect(result.analysis).toBeCloseTo(0.82);
	});

	it('bonuses stack additively', () => {
		const result = adjustedThresholds(DEFAULT_TIER_THRESHOLDS, 0.05, 0.03);
		// Total bonus = 0.08
		expect(result.anomaly).toBeCloseTo(0.07);
		expect(result.class).toBeCloseTo(0.32);
		expect(result.type).toBeCloseTo(0.57);
		expect(result.analysis).toBeCloseTo(0.77);
	});

	it('clamps thresholds to minimum 0', () => {
		const result = adjustedThresholds(DEFAULT_TIER_THRESHOLDS, 0.5, 0.5);
		expect(result.anomaly).toBe(0);
		expect(result.class).toBe(0);
		expect(result.type).toBe(0);
		expect(result.analysis).toBe(0);
	});

	it('correlator module makes anomaly easier to reach', () => {
		// A correlator module (equipment bonus 0.05) shifts anomaly from 0.15 → 0.10
		const adjusted = adjustedThresholds(DEFAULT_TIER_THRESHOLDS, 0.05);

		// Confidence 0.12 — below default anomaly (0.15) but above adjusted (0.10)
		expect(informationTier(0.12)).toBeNull();
		expect(informationTier(0.12, adjusted)).toBe('anomaly');
	});

	it('veteran sensor stacks with correlator', () => {
		// Correlator (0.05) + veteran bonus (0.03) = 0.08 total
		const adjusted = adjustedThresholds(
			DEFAULT_TIER_THRESHOLDS,
			0.05,
			0.03
		);

		// Confidence 0.08 — below both default and correlator-only anomaly
		// But above the stacked threshold (0.07)
		expect(informationTier(0.08)).toBeNull();
		expect(informationTier(0.08, adjusted)).toBe('anomaly');
	});
});
