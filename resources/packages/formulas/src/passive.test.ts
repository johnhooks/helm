import { describe, it, expect } from 'vitest';
import { SENSOR_AFFINITIES, DEFAULT_DSP_CONSTANTS } from './types';
import type { EmissionSource } from './passive';
import { passiveDetection, passiveReport } from './passive';

const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds; // 300s

describe('passiveDetection', () => {
	it('loud signal in quiet system hits confidence cap', () => {
		// PNP scan (5.0) in a quiet system (0.3 noise), VRS passive (1.0)
		// SNR is very high but passive is capped — want 100%? Use active scan.
		const confidence = passiveDetection(5.0, 0.3, 1.0, samplePeriod);
		expect(confidence).toBe(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);
	});

	it('silent emission is undetectable', () => {
		const confidence = passiveDetection(0, 1.0, 1.0, 3600);
		expect(confidence).toBeLessThan(0.5);
	});

	it('higher passive affinity improves detection', () => {
		const vrs = passiveDetection(1.0, 2.0, 1.0, 3600, samplePeriod);
		const dsc = passiveDetection(1.0, 2.0, 1.4, 3600, samplePeriod);
		expect(dsc).toBeGreaterThan(vrs);
	});

	it('longer integration improves detection', () => {
		const short = passiveDetection(1.0, 2.0, 1.0, 600, samplePeriod);
		const long = passiveDetection(1.0, 2.0, 1.0, 7200, samplePeriod);
		expect(long).toBeGreaterThan(short);
	});

	it('masking noise reduces detection', () => {
		const unmasked = passiveDetection(
			1.0,
			1.0,
			1.0,
			3600,
			samplePeriod,
			1.0,
			0
		);
		const masked = passiveDetection(
			1.0,
			1.0,
			1.0,
			3600,
			samplePeriod,
			1.0,
			3.0
		);
		expect(masked).toBeLessThan(unmasked);
	});

	it('matched filter gain improves detection', () => {
		const noGain = passiveDetection(1.0, 2.0, 1.0, 3600, samplePeriod, 1.0);
		const withGain = passiveDetection(
			1.0,
			2.0,
			1.0,
			3600,
			samplePeriod,
			1.5
		);
		expect(withGain).toBeGreaterThan(noGain);
	});

	it('pilot skill improves detection', () => {
		const rookie = passiveDetection(
			1.0,
			2.0,
			1.0,
			3600,
			samplePeriod,
			1.0,
			0,
			1.0
		);
		const veteran = passiveDetection(
			1.0,
			2.0,
			1.0,
			3600,
			samplePeriod,
			1.0,
			0,
			1.2
		);
		expect(veteran).toBeGreaterThan(rookie);
	});

	it('pilot skill stacks with sensor affinity', () => {
		// VRS (1.0) with veteran (1.2) should be similar to DSC (1.2) with rookie (1.0)
		const vrsVeteran = passiveDetection(
			1.0,
			1.0,
			1.0,
			3600,
			samplePeriod,
			1.0,
			0,
			1.2
		);
		const dscRookie = passiveDetection(
			1.0,
			1.0,
			1.2,
			3600,
			samplePeriod,
			1.0,
			0,
			1.0
		);
		// Same effective signal (1.0 × 1.0 × 1.2 = 1.0 × 1.2 × 1.0)
		expect(vrsVeteran).toBeCloseTo(dscRookie);
	});

	it('DSC detects open-space miner after hours of integration', () => {
		// Mining emission = 1.0, G-class noise = 1.0, no masking
		// DSC sensor (passive 1.4, continuous gain 1.5)
		// After 6 hours of patient observation — hits the passive cap
		const confidence = passiveDetection(
			1.0,
			1.0,
			1.4,
			6 * 3600,
			samplePeriod,
			1.5,
			0
		);
		expect(confidence).toBe(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);
	});

	it('passive detection never exceeds confidence cap', () => {
		// Even with absurd signal strength and perfect conditions
		const confidence = passiveDetection(
			100.0,
			0.1,
			2.0,
			48 * 3600,
			samplePeriod,
			2.0,
			0,
			1.5
		);
		expect(confidence).toBe(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);
		expect(confidence).toBeLessThan(1.0);
	});

	it('belt masking dramatically slows detection', () => {
		// Same DSC sensor but miner is in a belt (masking = 3.0)
		// Belt mining provides real protection — much harder to detect
		const open = passiveDetection(
			1.0,
			1.0,
			1.4,
			3600,
			samplePeriod,
			1.5,
			0
		);
		const belt = passiveDetection(
			1.0,
			1.0,
			1.4,
			3600,
			samplePeriod,
			1.5,
			3.0
		);
		expect(belt).toBeLessThan(open);
		expect(belt).toBeLessThan(0.5); // belt mining is genuinely safer
	});

	it('ACU is poor at passive detection', () => {
		// ACU (passive 0.6, continuous gain 0.7) watching a miner for 2 hours
		// ACU is the wrong tool for passive detection — use active scanning
		const confidence = passiveDetection(
			1.0,
			1.0,
			0.6,
			2 * 3600,
			samplePeriod,
			0.7,
			0
		);
		expect(confidence).toBeLessThan(0.5);
	});
});

describe('passiveReport', () => {
	const vrs = SENSOR_AFFINITIES.vrs;
	const dsc = SENSOR_AFFINITIES.dsc;

	it('returns detections sorted by confidence descending', () => {
		const sources: EmissionSource[] = [
			{ power: 0.5, spectralType: 'continuous', label: 'miner' },
			{ power: 5.0, spectralType: 'pulse', label: 'pnp_scan' },
			{ power: 2.0, spectralType: 'sweep', label: 'survey' },
		];

		const report = passiveReport(sources, 1.0, vrs, 3600, samplePeriod);
		expect(report.length).toBeGreaterThan(0);
		expect(report[0].label).toBe('pnp_scan');

		// Verify descending order
		for (let i = 0; i < report.length - 1; i++) {
			expect(report[i].confidence).toBeGreaterThanOrEqual(
				report[i + 1].confidence
			);
		}
	});

	it('filters out low-confidence detections', () => {
		const sources: EmissionSource[] = [
			{ power: 5.0, spectralType: 'pulse', label: 'loud' },
			{ power: 0.0, spectralType: 'continuous', label: 'silent' },
		];

		const report = passiveReport(
			sources,
			1.0,
			vrs,
			samplePeriod,
			samplePeriod,
			0.1
		);
		const labels = report.map((d) => d.label);
		expect(labels).toContain('loud');
		expect(labels).not.toContain('silent');
	});

	it('returns empty array when no sources', () => {
		const report = passiveReport([], 1.0, vrs, 3600);
		expect(report).toEqual([]);
	});

	it('applies masking noise per-source', () => {
		const sources: EmissionSource[] = [
			{ power: 1.0, spectralType: 'continuous', label: 'open_miner' },
			{
				power: 1.0,
				spectralType: 'continuous',
				label: 'belt_miner',
				maskingNoise: 3.0,
			},
		];

		const report = passiveReport(sources, 1.0, dsc, 3600, samplePeriod);
		const open = report.find((d) => d.label === 'open_miner');
		const belt = report.find((d) => d.label === 'belt_miner');

		// The miner in open space should be easier to detect
		if (open && belt) {
			expect(open.confidence).toBeGreaterThan(belt.confidence);
		}
	});

	it('DSC detects more sources than ACU in passive mode', () => {
		const acu = SENSOR_AFFINITIES.acu;
		const sources: EmissionSource[] = [
			{ power: 1.0, spectralType: 'continuous', label: 'miner' },
			{ power: 0.8, spectralType: 'continuous', label: 'salvager' },
			{ power: 4.0, spectralType: 'pulse', label: 'drive_spool' },
		];

		const dscReport = passiveReport(
			sources,
			2.0,
			dsc,
			3600,
			samplePeriod,
			0.5
		);
		const acuReport = passiveReport(
			sources,
			2.0,
			acu,
			3600,
			samplePeriod,
			0.5
		);

		// DSC should detect at least as many sources at the 0.5 confidence level
		expect(dscReport.length).toBeGreaterThanOrEqual(acuReport.length);
	});

	it('preserves labels for caller identification', () => {
		const sources: EmissionSource[] = [
			{ power: 5.0, spectralType: 'pulse', label: 'ship_42_pnp' },
		];

		const report = passiveReport(sources, 1.0, vrs, 3600);
		expect(report[0].label).toBe('ship_42_pnp');
	});

	it('handles sources without labels', () => {
		const sources: EmissionSource[] = [
			{ power: 5.0, spectralType: 'pulse' },
		];

		const report = passiveReport(sources, 1.0, vrs, 3600);
		expect(report.length).toBe(1);
		expect(report[0].label).toBeUndefined();
	});
});
