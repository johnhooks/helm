/**
 * Gameplay Contract Tests — math-level assertions extracted from dsp-progress.
 *
 * These test the formula contract: the properties that make the game work.
 * If any of these fail, a formula change has broken a gameplay invariant.
 *
 * The workbench dsp-progress command checks the gameplay *implication* of these
 * formulas. These tests check the math itself.
 */

import { describe, it, expect } from 'vitest';
import {
	DEFAULT_DSP_CONSTANTS,
	DEFAULT_EMISSION_PROFILES,
	DEFAULT_DRIVE_ENVELOPES,
	SENSOR_AFFINITIES,
	emissionPower,
	stellarNoise,
	noiseFloor,
	snr,
	integrationGain,
	detectionProbability,
	matchedFilterGain,
	passiveDetection,
	envelopePeakPower,
	invertSigmoid,
} from './index';

const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;

function hours(h: number): number {
	return h * 3600;
}

// G-class (Sol-like) empty system — the reference noise floor
const gNoise = noiseFloor(stellarNoise('G'), []);
const dsc = SENSOR_AFFINITIES.dsc;
const vrs = SENSOR_AFFINITIES.vrs;
const acu = SENSOR_AFFINITIES.acu;
const dscContGain = matchedFilterGain(dsc, 'continuous');

describe('submarine warfare — hiding and detection', () => {
	it('idle ships are undetectable even after 48hr DSC observation', () => {
		const conf = passiveDetection(
			emissionPower('idle'), gNoise, dsc.passive, hours(48), samplePeriod, dscContGain, 0,
		);
		expect(conf).toBeLessThan(0.05);
	});

	it('belt miner is safe for ~6hr vs DSC (masking=3.0)', () => {
		const conf = passiveDetection(
			emissionPower('mining'), gNoise, dsc.passive, hours(6), samplePeriod, dscContGain, 3.0,
		);
		expect(conf).toBeLessThan(0.5);
	});

	it('open-space miner detectable by DSC after ~6hr integration', () => {
		const conf = passiveDetection(
			emissionPower('mining'), gNoise, dsc.passive, hours(6), samplePeriod, dscContGain, 0,
		);
		expect(conf).toBeGreaterThan(0.9);
	});

	it('shield regen barely detectable even with DSC at 12hr', () => {
		const conf = passiveDetection(
			emissionPower('shield_regen'), gNoise, dsc.passive, hours(12), samplePeriod, dscContGain, 0,
		);
		expect(conf).toBeLessThan(0.5);
	});
});

describe('sensor differentiation — distinct playstyles', () => {
	it('DSC > VRS > ACU for passive continuous detection', () => {
		const pd = (aff: typeof dsc) => {
			const gain = matchedFilterGain(aff, 'continuous');
			return passiveDetection(emissionPower('mining'), gNoise, aff.passive, hours(2), samplePeriod, gain, 0);
		};
		expect(pd(dsc)).toBeGreaterThan(pd(vrs));
		expect(pd(vrs)).toBeGreaterThan(pd(acu));
	});

	it('ACU is genuinely poor at passive detection (< 0.4 at 6hr)', () => {
		const acuGain = matchedFilterGain(acu, 'continuous');
		const conf = passiveDetection(
			emissionPower('mining'), gNoise, acu.passive, hours(6), samplePeriod, acuGain, 0,
		);
		expect(conf).toBeLessThan(0.4);
	});

	it('matched filter specialization: ACU excels at pulse, DSC at continuous', () => {
		const acuPulse = matchedFilterGain(acu, 'pulse');
		const dscPulse = matchedFilterGain(dsc, 'pulse');
		const acuCont = matchedFilterGain(acu, 'continuous');
		const dscCont = matchedFilterGain(dsc, 'continuous');

		expect(acuPulse).toBeGreaterThan(dscPulse);
		expect(dscCont).toBeGreaterThan(acuCont);
	});
});

describe('emission and detection tuning', () => {
	it('peak power ranking: military > industrial > civilian', () => {
		const mil = envelopePeakPower(DEFAULT_DRIVE_ENVELOPES['dr-705']);
		const ind = envelopePeakPower(DEFAULT_DRIVE_ENVELOPES['dr-505']);
		const civ = envelopePeakPower(DEFAULT_DRIVE_ENVELOPES['dr-305']);

		expect(mil).toBeGreaterThan(ind);
		expect(ind).toBeGreaterThan(civ);
	});

	it('emission ranking: weapons > PNP > drive_spool', () => {
		const weapons = DEFAULT_EMISSION_PROFILES.weapons_fire.base;
		const pnp = DEFAULT_EMISSION_PROFILES.pnp_scan.base;
		const spool = DEFAULT_EMISSION_PROFILES.drive_spool.base;

		expect(weapons).toBeGreaterThan(pnp);
		expect(pnp).toBeGreaterThan(spool);
	});

	it('sigmoid transition zone is 4-12 SNR wide (gradual, no brick walls)', () => {
		const snr10 = invertSigmoid(0.1);
		const snr90 = invertSigmoid(0.9);
		const width = snr90 - snr10;

		expect(width).toBeGreaterThanOrEqual(4.0);
		expect(width).toBeLessThanOrEqual(12.0);
	});

	it('integration gain shows sqrt(N) scaling (diminishing returns)', () => {
		const rawSNR = snr(emissionPower('mining'), gNoise);

		const int1hr = integrationGain(rawSNR, Math.floor(hours(1) / samplePeriod));
		const int4hr = integrationGain(rawSNR, Math.floor(hours(4) / samplePeriod));
		const int16hr = integrationGain(rawSNR, Math.floor(hours(16) / samplePeriod));

		// 4x time should give ~2x gain (sqrt scaling)
		const ratio1to4 = int4hr / int1hr;
		const ratio4to16 = int16hr / int4hr;

		expect(ratio1to4).toBeCloseTo(2.0, 0);
		expect(ratio4to16).toBeCloseTo(2.0, 0);
	});

	it('noise floor scales sub-linearly with ship count (RMS model)', () => {
		const minerEmission = emissionPower('mining');
		const baseline = stellarNoise('G');
		const noise10 = noiseFloor(baseline, Array(10).fill(minerEmission) as number[]);
		const noise100 = noiseFloor(baseline, Array(100).fill(minerEmission) as number[]);

		// 10x more ships should NOT give 10x more noise
		const ratio = (noise100 - baseline) / (noise10 - baseline);
		// sqrt(100)/sqrt(10) ≈ 3.16, not 10
		expect(ratio).toBeLessThan(5);
		expect(ratio).toBeGreaterThan(2);
	});
});

describe('detection curves — active vs passive thresholds', () => {
	it('active detection is possible at lower SNR than passive', () => {
		const lowSNR = 2.0;
		const activeP = detectionProbability(lowSNR, DEFAULT_DSP_CONSTANTS.activeThreshold);
		const passiveP = detectionProbability(lowSNR, DEFAULT_DSP_CONSTANTS.detectionThreshold);

		expect(activeP).toBeGreaterThan(passiveP);
	});

	it('passive confidence cap prevents certainty (must use active for 100%)', () => {
		const conf = passiveDetection(100.0, 0.1, 2.0, hours(48), samplePeriod, 2.0, 0);
		expect(conf).toBe(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap);
		expect(conf).toBeLessThan(1.0);
	});
});

describe('self-interference — own emissions degrade scanning', () => {
	it('military cooldown raises noise floor more than civilian', () => {
		const baseline = stellarNoise('G');
		const cooldownBase = DEFAULT_EMISSION_PROFILES.drive_cooldown.base;

		const milPeak = DEFAULT_DRIVE_ENVELOPES['dr-705'].cooldown.peakPower * cooldownBase;
		const civPeak = DEFAULT_DRIVE_ENVELOPES['dr-305'].cooldown.peakPower * cooldownBase;

		const milNoise = noiseFloor(baseline, [milPeak]);
		const civNoise = noiseFloor(baseline, [civPeak]);
		const cleanNoise = noiseFloor(baseline, []);

		expect(milNoise).toBeGreaterThan(civNoise);
		expect(civNoise).toBeGreaterThan(cleanNoise);
	});

	it('military cooldown meaningfully degrades scanning', () => {
		const baseline = stellarNoise('G');
		const cooldownBase = DEFAULT_EMISSION_PROFILES.drive_cooldown.base;
		const milPeak = DEFAULT_DRIVE_ENVELOPES['dr-705'].cooldown.peakPower * cooldownBase;

		const cleanNoise = noiseFloor(baseline, []);
		const hotNoise = noiseFloor(baseline, [milPeak]);

		const cleanConf = passiveDetection(
			emissionPower('mining'), cleanNoise, dsc.passive, hours(2), samplePeriod, dscContGain, 0,
		);
		const hotConf = passiveDetection(
			emissionPower('mining'), hotNoise, dsc.passive, hours(2), samplePeriod, dscContGain, 0,
		);

		// Military cooldown should degrade scanning by at least 20%
		expect(hotConf).toBeLessThan(cleanConf * 0.8);
	});
});
