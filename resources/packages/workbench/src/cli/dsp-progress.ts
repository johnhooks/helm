/**
 * DSP Progress Analysis — evaluates how the formula layer serves gameplay goals.
 *
 * This command reads the DSP formula outputs and checks them against the design
 * goals from docs/dev/dsp.md, docs/scanning.md, and docs/plans/envelopes.md.
 *
 * Run: bun run src/cli.ts dsp-progress
 *
 * The output is a structured assessment: what works, what's missing, and what
 * needs tuning. Reusable across iterations — run it after any formula change
 * to see how the gameplay characteristics shifted.
 */

import {
	DEFAULT_EMISSION_PROFILES,
	DEFAULT_DSP_CONSTANTS,
	DEFAULT_DRIVE_ENVELOPES,
	DEFAULT_TIER_THRESHOLDS,
	SENSOR_AFFINITIES,
	emissionPower,
	stellarNoise,
	noiseFloor,
	snr,
	integrationGain,
	matchedFilterGain,
	envelopeDuration,
	passiveDetection,
	envelopeAt,
	envelopePeakPower,
	estimateEmissionPower,
	classifyEmission,
	invertSigmoid,
	informationTier,
	adjustedThresholds,
} from '@helm/formulas';

import { r, pct } from '../format';

// ── Helpers ──────────────────────────────────────────────────

function hours(h: number): number {
	return h * 3600;
}

type Verdict = 'PASS' | 'WARN' | 'FAIL' | 'INFO';

function assess(pass: boolean, warn: boolean): Verdict {
	if (pass) {
		return 'PASS';
	}
	if (warn) {
		return 'WARN';
	}
	return 'FAIL';
}

interface Check {
	goal: string;
	verdict: Verdict;
	detail: string;
	values?: Record<string, unknown>;
}

interface Section {
	title: string;
	description: string;
	checks: Check[];
}

// ── Section 1: Submarine Warfare — Can You Hide? ─────────────

function submarineWarfare(): Section {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const dsc = SENSOR_AFFINITIES.dsc;
	const dscContGain = matchedFilterGain(dsc, 'continuous');

	const checks: Check[] = [];

	// Idle ships must be undetectable
	const idleConf = passiveDetection(
		emissionPower('idle'), noise, dsc.passive, hours(48), samplePeriod, dscContGain, 0,
	);
	checks.push({
		goal: 'Idle ships are undetectable (even after 48hr DSC observation)',
		verdict: idleConf < 0.05 ? 'PASS' : 'FAIL',
		detail: `Idle emission = ${emissionPower('idle')}. DSC 48hr confidence = ${pct(idleConf)}.`,
		values: { idleEmission: emissionPower('idle'), confidence48hr: r(idleConf) },
	});

	// Miner in belt should be safe for hours
	const minerBelt6hr = passiveDetection(
		emissionPower('mining'), noise, dsc.passive, hours(6), samplePeriod, dscContGain, 3.0,
	);
	const minerBelt24hr = passiveDetection(
		emissionPower('mining'), noise, dsc.passive, hours(24), samplePeriod, dscContGain, 3.0,
	);
	checks.push({
		goal: 'Belt miner is safe for ~6hr even vs DSC (masking=3.0)',
		verdict: assess(minerBelt6hr < 0.3, minerBelt6hr < 0.5),
		detail: `Belt miner (masking=3): 6hr=${pct(minerBelt6hr)}, 24hr=${pct(minerBelt24hr)}.`,
		values: { conf6hr: r(minerBelt6hr), conf24hr: r(minerBelt24hr) },
	});

	// Open-space miner should be findable with patience
	const minerOpen6hr = passiveDetection(
		emissionPower('mining'), noise, dsc.passive, hours(6), samplePeriod, dscContGain, 0,
	);
	checks.push({
		goal: 'Open-space miner detectable by DSC after ~6hr integration',
		verdict: assess(minerOpen6hr > 0.9, minerOpen6hr > 0.5),
		detail: `Open miner, DSC 6hr = ${pct(minerOpen6hr)}.`,
		values: { confidence: r(minerOpen6hr) },
	});

	// PNP scan detection builds over samples — loud but not instant with gradual sigmoid
	const pnpInstant = passiveDetection(
		emissionPower('pnp_scan'), noise, 1.0, samplePeriod, samplePeriod, 1.0, 0,
	);
	const pnp30min = passiveDetection(
		emissionPower('pnp_scan'), noise, 1.0, samplePeriod * 6, samplePeriod, 1.0, 0,
	);
	checks.push({
		goal: 'PNP scan detectable within ~30 min (VRS passive)',
		verdict: assess(pnp30min >= 0.8, pnp30min > 0.5),
		detail: `PNP emission=${emissionPower('pnp_scan')}, VRS: 1-sample=${pct(pnpInstant)}, 30min=${pct(pnp30min)}. Cap=${pct(DEFAULT_DSP_CONSTANTS.passiveConfidenceCap)}.`,
		values: { conf1: r(pnpInstant), conf30m: r(pnp30min) },
	});

	// Shield regen should be nearly invisible
	const shieldOpen12hr = passiveDetection(
		emissionPower('shield_regen'), noise, dsc.passive, hours(12), samplePeriod, dscContGain, 0,
	);
	checks.push({
		goal: 'Shield regen barely detectable (even DSC, 12hr, open space)',
		verdict: assess(shieldOpen12hr < 0.25, shieldOpen12hr < 0.5),
		detail: `Shield regen emission=${emissionPower('shield_regen')}, DSC 12hr = ${pct(shieldOpen12hr)}.`,
		values: { confidence: r(shieldOpen12hr) },
	});

	return {
		title: 'Submarine Warfare — Can You Hide?',
		description: 'The core promise: idle ships invisible, belt miners safe, loud actions obvious.',
		checks,
	};
}

// ── Section 2: Sensor Differentiation — Do They Feel Different? ──

function sensorDifferentiation(): Section {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const checks: Check[] = [];

	const sensors = ['acu', 'vrs', 'dsc'] as const;
	const miningPower = emissionPower('mining');
	// DSC should be the best passive detector for continuous signals
	// Use 2hr comparison — at 6hr DSC may cap, obscuring differentiation
	const passiveMiner2hr: Record<string, number> = {};
	for (const s of sensors) {
		const aff = SENSOR_AFFINITIES[s];
		const gain = matchedFilterGain(aff, 'continuous');
		passiveMiner2hr[s] = passiveDetection(miningPower, noise, aff.passive, hours(2), samplePeriod, gain, 0);
	}
	checks.push({
		goal: 'DSC > VRS > ACU for passive detection of continuous signals',
		verdict: passiveMiner2hr.dsc > passiveMiner2hr.vrs && passiveMiner2hr.vrs > passiveMiner2hr.acu ? 'PASS' : 'FAIL',
		detail: `2hr mining passive: DSC=${pct(passiveMiner2hr.dsc)}, VRS=${pct(passiveMiner2hr.vrs)}, ACU=${pct(passiveMiner2hr.acu)}.`,
		values: passiveMiner2hr,
	});

	// ACU should have meaningfully lower passive detection
	const acuPassive6hr = passiveDetection(miningPower, noise, SENSOR_AFFINITIES.acu.passive, hours(6), samplePeriod, matchedFilterGain(SENSOR_AFFINITIES.acu, 'continuous'), 0);
	checks.push({
		goal: 'ACU is genuinely poor at passive detection (< 20% for miner at 6hr)',
		verdict: assess(acuPassive6hr < 0.2, acuPassive6hr < 0.4),
		detail: `ACU 6hr passive miner = ${pct(acuPassive6hr)}. ACU should need active scanning.`,
		values: { acuPassive: r(acuPassive6hr) },
	});

	// Matched filter: ACU should excel at pulses, DSC at continuous
	const acuPulse = matchedFilterGain(SENSOR_AFFINITIES.acu, 'pulse');
	const dscPulse = matchedFilterGain(SENSOR_AFFINITIES.dsc, 'pulse');
	const acuCont = matchedFilterGain(SENSOR_AFFINITIES.acu, 'continuous');
	const dscCont = matchedFilterGain(SENSOR_AFFINITIES.dsc, 'continuous');
	checks.push({
		goal: 'Matched filter specialization: ACU→pulse, DSC→continuous',
		verdict: acuPulse > dscPulse && dscCont > acuCont ? 'PASS' : 'FAIL',
		detail: `ACU pulse=${acuPulse} cont=${acuCont}. DSC pulse=${dscPulse} cont=${dscCont}.`,
		values: { acuPulse, acuCont, dscPulse, dscCont },
	});

	// VRS should be the generalist — never best, never worst
	const vrsPulse = matchedFilterGain(SENSOR_AFFINITIES.vrs, 'pulse');
	const vrsCont = matchedFilterGain(SENSOR_AFFINITIES.vrs, 'continuous');
	checks.push({
		goal: 'VRS is generalist: moderate gains, never best or worst',
		verdict: vrsPulse === 1.0 && vrsCont === 1.0 ? 'PASS' : 'WARN',
		detail: `VRS pulse=${vrsPulse}, continuous=${vrsCont}. Should be 1.0 (neutral).`,
		values: { vrsPulse, vrsCont },
	});

	return {
		title: 'Sensor Differentiation — Do They Feel Different?',
		description: 'ACU = loud hunter, DSC = patient listener, VRS = generalist. Each should create a distinct playstyle.',
		checks,
	};
}

// ── Section 3: Drive Envelope Personalities ──────────────────

function driveEnvelopes(): Section {
	const checks: Check[] = [];
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const dsc = SENSOR_AFFINITIES.dsc;
	const pulseGain = matchedFilterGain(dsc, 'pulse');
	const baseEmission = DEFAULT_EMISSION_PROFILES.drive_spool.base;

	const DRIVE_KEYS = Object.keys(DEFAULT_DRIVE_ENVELOPES);

	// Peak power ranking: military > industrial > civilian
	const peaks = DRIVE_KEYS.map(k => ({
		key: k,
		label: DEFAULT_DRIVE_ENVELOPES[k].label,
		peak: envelopePeakPower(DEFAULT_DRIVE_ENVELOPES[k]),
	}));
	peaks.sort((a, b) => b.peak - a.peak);
	checks.push({
		goal: 'Peak power ranking: military > industrial > civilian',
		verdict: peaks[0].key === 'dr-705' && peaks[1].key === 'dr-505' && peaks[2].key === 'dr-305' ? 'PASS' : 'FAIL',
		detail: peaks.map(p => `${p.label}: peak=${p.peak}`).join('. '),
		values: Object.fromEntries(peaks.map(p => [p.key, p.peak])),
	});

	// Military spool — loud signal, detectable with awareness that builds
	const milEnv = DEFAULT_DRIVE_ENVELOPES['dr-705'];
	const milAtPeak = envelopePeakPower(milEnv) * baseEmission;
	const milConfPeak1 = passiveDetection(milAtPeak, noise, dsc.passive, samplePeriod, samplePeriod, pulseGain, 0);
	const milConfPeak3 = passiveDetection(milAtPeak, noise, dsc.passive, samplePeriod * 3, samplePeriod, pulseGain, 0);
	checks.push({
		goal: 'Military spool at peak detectable within a few samples (DSC)',
		verdict: assess(milConfPeak3 > 0.5, milConfPeak3 > 0.2),
		detail: `DR-705 peak: power=${r(milAtPeak)}, DSC 1-sample=${pct(milConfPeak1)}, 3-samples (${samplePeriod * 3 / 60}min)=${pct(milConfPeak3)}.`,
		values: { power: r(milAtPeak), conf1: r(milConfPeak1), conf3: r(milConfPeak3) },
	});

	// Civilian spool should take most of the spool to become detectable
	const civEnv = DEFAULT_DRIVE_ENVELOPES['dr-305'];
	const civAt50pct = envelopeAt(civEnv.spool.duration * 0.5, civEnv).power * baseEmission;
	const civConf50pct = passiveDetection(civAt50pct, noise, dsc.passive, samplePeriod, samplePeriod, pulseGain, 0);
	checks.push({
		goal: 'Civilian drive still stealthy at 50% spool',
		verdict: assess(civConf50pct < 0.1, civConf50pct < 0.3),
		detail: `DR-305 at 50% spool (${r(civEnv.spool.duration * 0.5)}s): power=${r(civAt50pct)}, confidence=${pct(civConf50pct)}.`,
		values: { power: r(civAt50pct), confidence: r(civConf50pct) },
	});

	// Military sustain should be quieter than civilian (stealthy at cruise)
	checks.push({
		goal: 'Military sustain is quieter than civilian (stealthy at cruise)',
		verdict: milEnv.sustain.peakPower < civEnv.sustain.peakPower ? 'PASS' : 'FAIL',
		detail: `DR-705 sustain=${milEnv.sustain.peakPower}, DR-305 sustain=${civEnv.sustain.peakPower}.`,
		values: { military: milEnv.sustain.peakPower, civilian: civEnv.sustain.peakPower },
	});

	// Envelope total durations make gameplay sense
	// Spool durations are minutes now — catchable by 1-10 min passive scanning.
	// Bigger ships take longer (more vulnerable, but tougher).
	for (const key of DRIVE_KEYS) {
		const env = DEFAULT_DRIVE_ENVELOPES[key];
		const totalSpool = env.spool.duration;
		const totalCooldown = env.cooldown.duration;
		checks.push({
			goal: `${env.label}: spool and cooldown durations are gameplay-meaningful`,
			verdict: totalSpool >= 60 && totalSpool <= 300 && totalCooldown >= 60 && totalCooldown <= 300 ? 'PASS' : 'WARN',
			detail: `Spool=${totalSpool}s (${r(totalSpool / 60, 1)}min), cooldown=${totalCooldown}s (${r(totalCooldown / 60, 1)}min). Should be 1-5 min for catchable detection windows.`,
			values: { spool: totalSpool, cooldown: totalCooldown },
		});
	}

	return {
		title: 'Drive Envelope Personalities',
		description: 'Each drive class should have a distinctive EM signature. Military = brutal/fast, civilian = gentle/slow, industrial = hot/heavy.',
		checks,
	};
}

// ── Section 4: Signature Analysis — What Can You Learn? ──────

function signatureAnalysis(): Section {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const dsc = SENSOR_AFFINITIES.dsc;
	const checks: Check[] = [];

	// Round-trip accuracy: emit → detect → estimate → classify
	const testCases = [
		{ label: 'PNP scan', power: emissionPower('pnp_scan'), spectralType: 'pulse' as const, integration: hours(1), masking: 0 },
		{ label: 'Mining', power: emissionPower('mining'), spectralType: 'continuous' as const, integration: hours(6), masking: 0 },
		{ label: 'Belt miner', power: emissionPower('mining'), spectralType: 'continuous' as const, integration: hours(12), masking: 2.0 },
		{ label: 'Drive spool', power: emissionPower('drive_spool'), spectralType: 'pulse' as const, integration: hours(2), masking: 0 },
	];

	for (const tc of testCases) {
		const gain = matchedFilterGain(dsc, tc.spectralType);
		const confidence = passiveDetection(tc.power, noise, dsc.passive, tc.integration, samplePeriod, gain, tc.masking);

		if (confidence <= 0 || confidence >= 1) {
			checks.push({
				goal: `Round-trip: ${tc.label} (power=${tc.power})`,
				verdict: 'WARN',
				detail: `Confidence is ${confidence >= 1 ? '100%' : '0%'} — sigmoid saturated, estimation degrades at extremes. ${confidence >= 1 ? 'Signal so loud that inversion returns Infinity.' : 'Signal too weak to estimate.'}`,
				values: { truePower: tc.power, confidence: r(confidence), estimated: confidence >= 1 ? Infinity : 0 },
			});
			continue;
		}

		const estimated = estimateEmissionPower(confidence, noise, dsc.passive, tc.integration, samplePeriod, gain, tc.masking);
		const classification = classifyEmission(estimated);
		const error = Math.abs(estimated - tc.power);

		// When confidence is at the passive cap, estimation inherently underestimates.
		// This is expected — passive can't give precise power readings for loud signals.
		const atCap = confidence >= DEFAULT_DSP_CONSTANTS.passiveConfidenceCap;

		checks.push({
			goal: `Round-trip: ${tc.label} (power=${tc.power})`,
			verdict: atCap ? 'INFO' : assess(error < 0.5, error < 1.0),
			detail: atCap
				? `At passive cap (${pct(confidence)}). Estimated=${r(estimated)} (underestimates true power=${tc.power}). Use active scan for precise readings.`
				: `Confidence=${pct(confidence)}, estimated=${r(estimated)}, error=${r(error)}, top_match=${classification[0].type}.`,
			values: { truePower: tc.power, confidence: r(confidence), estimated: r(estimated), error: r(error), topMatch: classification[0].type, atCap },
		});
	}

	// Drive classification: can you distinguish drive classes by their peak signature?
	const baseEmission = DEFAULT_EMISSION_PROFILES.drive_spool.base;
	const driveKeys = Object.keys(DEFAULT_DRIVE_ENVELOPES);
	const driveProfiles: Record<string, { base: number; spectralType: 'pulse' }> = {};
	for (const key of driveKeys) {
		driveProfiles[key] = {
			base: envelopePeakPower(DEFAULT_DRIVE_ENVELOPES[key]) * baseEmission,
			spectralType: 'pulse',
		};
	}

	let allCorrect = true;
	const driveResults: string[] = [];
	for (const key of driveKeys) {
		const env = DEFAULT_DRIVE_ENVELOPES[key];
		const peakPower = envelopePeakPower(env) * baseEmission;
		const gain = matchedFilterGain(dsc, 'pulse');
		const confidence = passiveDetection(peakPower, noise, dsc.passive, samplePeriod, samplePeriod, gain, 0);

		let guessedKey = key;
		if (confidence > 0 && confidence < 1) {
			const estimated = estimateEmissionPower(confidence, noise, dsc.passive, samplePeriod, samplePeriod, gain, 0);
			const classification = classifyEmission(estimated, driveProfiles);
			guessedKey = classification[0].type;
		}

		const correct = guessedKey === key;
		if (!correct) {
			allCorrect = false;
		}
		driveResults.push(`${env.label}: peak=${r(peakPower)}, conf=${pct(confidence)}, identified=${correct ? 'YES' : 'NO (guessed ' + guessedKey + ')'}`);
	}

	checks.push({
		goal: 'All 3 drive classes identifiable by peak spool signature',
		verdict: allCorrect ? 'PASS' : 'WARN',
		detail: driveResults.join('. '),
	});

	return {
		title: 'Signature Analysis — What Can You Learn?',
		description: 'Passive observation should reveal information: emission power estimation, activity classification, drive identification.',
		checks,
	};
}

// ── Section 5: Information Hierarchy ─────────────────────────

function informationHierarchy(): Section {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const dsc = SENSOR_AFFINITIES.dsc;
	const checks: Check[] = [];

	// At 2 hours: should detect activity but not classify well
	// At 6 hours: should start classifying
	// At 12 hours: should classify with confidence
	const miningPower = emissionPower('mining');
	const dscContGain = matchedFilterGain(dsc, 'continuous');

	const conf30m = passiveDetection(miningPower, noise, dsc.passive, hours(0.5), samplePeriod, dscContGain, 0);
	const conf2hr = passiveDetection(miningPower, noise, dsc.passive, hours(2), samplePeriod, dscContGain, 0);
	const conf6hr = passiveDetection(miningPower, noise, dsc.passive, hours(6), samplePeriod, dscContGain, 0);
	const conf12hr = passiveDetection(miningPower, noise, dsc.passive, hours(12), samplePeriod, dscContGain, 0);

	const cap = DEFAULT_DSP_CONSTANTS.passiveConfidenceCap;
	checks.push({
		goal: `Progressive revelation: 30m → anomaly, 2hr → type, 4hr → cap (${pct(cap)})`,
		verdict: assess(conf30m < 0.3 && conf2hr > 0.5 && conf6hr >= cap, conf30m < 0.5 && conf6hr > 0.5),
		detail: `Open miner vs DSC: 30m=${pct(conf30m)}, 2hr=${pct(conf2hr)}, 6hr=${pct(conf6hr)}, 12hr=${pct(conf12hr)}. Passive cap=${pct(cap)}.`,
		values: { conf30m: r(conf30m), conf2hr: r(conf2hr), conf6hr: r(conf6hr), conf12hr: r(conf12hr) },
	});

	// At low confidence, classification should be ambiguous
	// At high confidence, classification should be precise
	if (conf2hr > 0 && conf2hr < 1) {
		const est2hr = estimateEmissionPower(conf2hr, noise, dsc.passive, hours(2), samplePeriod, dscContGain, 0);
		const class2hr = classifyEmission(est2hr);
		const topDistance2hr = class2hr[0].distance;
		const runnerDistance2hr = class2hr.length > 1 ? class2hr[1].distance : Infinity;
		const separation2hr = runnerDistance2hr - topDistance2hr;

		const est6hr = estimateEmissionPower(conf6hr, noise, dsc.passive, hours(6), samplePeriod, dscContGain, 0);
		const class6hr = classifyEmission(est6hr);
		const topDistance6hr = class6hr[0].distance;
		const runnerDistance6hr = class6hr.length > 1 ? class6hr[1].distance : Infinity;
		const separation6hr = runnerDistance6hr - topDistance6hr;

		checks.push({
			goal: 'Classification improves with integration time',
			verdict: separation6hr > separation2hr ? 'PASS' : 'WARN',
			detail: `2hr: top=${class2hr[0].type} (sep=${r(separation2hr)}). 6hr: top=${class6hr[0].type} (sep=${r(separation6hr)}). Wider separation = more confident classification.`,
			values: { sep2hr: r(separation2hr), sep6hr: r(separation6hr), top2hr: class2hr[0].type, top6hr: class6hr[0].type },
		});
	}

	// Cost of information escalates: passive is free, active is loud
	const pnpEmission = emissionPower('pnp_scan');
	const surveyEmission = emissionPower('system_survey');
	checks.push({
		goal: 'Information cost hierarchy: passive=0, survey=moderate, PNP=loud',
		verdict: pnpEmission > surveyEmission && surveyEmission > 0 ? 'PASS' : 'FAIL',
		detail: `Passive emission=0. Survey emission=${surveyEmission}. PNP emission=${pnpEmission}. Each level reveals more but costs more signal.`,
		values: { passive: 0, survey: surveyEmission, pnp: pnpEmission },
	});

	return {
		title: 'Information Hierarchy — Escalating Detail at Escalating Cost',
		description: 'From docs/dev/dsp.md: "Integration refines classification over time." Patient observation → awareness → identification.',
		checks,
	};
}

// ── Section 6: Information Tiers — What Do You Learn? ────────

function informationTiers(): Section {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const dsc = SENSOR_AFFINITIES.dsc;
	const dscContGain = matchedFilterGain(dsc, 'continuous');
	const dscPulseGain = matchedFilterGain(dsc, 'pulse');
	const checks: Check[] = [];

	// PNP scan should reach analysis tier within ~30-60 min
	const pnpConf1 = passiveDetection(
		emissionPower('pnp_scan'), noise, 1.0, samplePeriod, samplePeriod, 1.0, 0,
	);
	const pnpConf30m = passiveDetection(
		emissionPower('pnp_scan'), noise, 1.0, samplePeriod * 6, samplePeriod, 1.0, 0,
	);
	const pnpTier1 = informationTier(pnpConf1);
	const pnpTier30m = informationTier(pnpConf30m);
	checks.push({
		goal: 'PNP scan progresses: anomaly immediately, analysis within 30min (VRS)',
		verdict: assess(pnpTier1 !== null && pnpTier30m === 'analysis', pnpTier30m === 'type' || pnpTier30m === 'analysis'),
		detail: `PNP VRS: 1-sample=${pct(pnpConf1)} [${pnpTier1 ?? 'none'}], 30min=${pct(pnpConf30m)} [${pnpTier30m ?? 'none'}].`,
		values: { conf1: r(pnpConf1), tier1: pnpTier1, conf30m: r(pnpConf30m), tier30m: pnpTier30m },
	});

	// Miner detection should progress through tiers over time
	const miningPower = emissionPower('mining');
	const tierTimeline = [1, 2, 4, 6, 8, 12].map(h => {
		const conf = passiveDetection(miningPower, noise, dsc.passive, hours(h), samplePeriod, dscContGain, 0);
		return { hours: h, confidence: r(conf), tier: informationTier(conf) };
	});

	checks.push({
		goal: 'Miner detection progresses through tiers over hours (DSC)',
		verdict: assess(tierTimeline.some(t => t.tier === 'class') && tierTimeline.some(t => t.tier === 'analysis'), tierTimeline.some(t => t.tier !== null)),
		detail: tierTimeline.map(t => `${t.hours}hr=${pct(t.confidence)}[${t.tier ?? '-'}]`).join(', '),
		values: Object.fromEntries(tierTimeline.map(t => [`${t.hours}hr`, { conf: t.confidence, tier: t.tier }])),
	});

	// Drive spool at peak: DSC should reach type or analysis tier
	const driveSpoolPeak = envelopePeakPower(DEFAULT_DRIVE_ENVELOPES['dr-705']) * DEFAULT_EMISSION_PROFILES.drive_spool.base;
	const driveConf = passiveDetection(driveSpoolPeak, noise, dsc.passive, samplePeriod, samplePeriod, dscPulseGain, 0);
	const driveTier = informationTier(driveConf);
	checks.push({
		goal: 'Military drive spool at peak reaches type tier (DSC, 1 sample)',
		verdict: assess(driveTier === 'analysis' || driveTier === 'type', driveTier === 'class'),
		detail: `DR-705 peak DSC 1-sample: confidence=${pct(driveConf)}, tier=${driveTier ?? 'none'}.`,
		values: { confidence: r(driveConf), tier: driveTier },
	});

	// Equipment bonus: correlator module shifts thresholds
	const correlatorThresholds = adjustedThresholds(DEFAULT_TIER_THRESHOLDS, 0.05);
	const marginalConf = 0.62; // Just below default 'type' (0.65)
	const defaultTier = informationTier(marginalConf);
	const boostedTier = informationTier(marginalConf, correlatorThresholds);
	checks.push({
		goal: 'Correlator module (bonus=0.05) shifts a marginal reading up one tier',
		verdict: boostedTier !== null && defaultTier !== boostedTier ? 'PASS' : 'WARN',
		detail: `Confidence=${pct(marginalConf)}: default=${defaultTier ?? 'none'}, with correlator=${boostedTier ?? 'none'}. Thresholds shifted by 0.05.`,
		values: { confidence: marginalConf, defaultTier, boostedTier },
	});

	return {
		title: 'Information Tiers — What Do You Learn?',
		description: 'Confidence maps to information quality: anomaly → class → type → analysis. Equipment and experience shift thresholds.',
		checks,
	};
}

// ── Section 7: Implementation Coverage ───────────────────────

function implementationCoverage(): Section {
	const checks: Check[] = [];

	// Formula modules implemented
	const modules = [
		{ name: 'emission.ts', desc: 'Source signal power', status: 'done' },
		{ name: 'noise.ts', desc: 'Noise floor (stellar + ships + belt + ECM + shipNoiseFactor)', status: 'done' },
		{ name: 'snr.ts', desc: 'SNR, masked SNR, integration gain', status: 'done' },
		{ name: 'detection.ts', desc: 'Detection sigmoid, cumulative detection, matched filter', status: 'done' },
		{ name: 'passive.ts', desc: 'Full passive pipeline, multi-source report', status: 'done' },
		{ name: 'envelope.ts', desc: 'Drive ADSR envelope (spool/sustain/cooldown)', status: 'done' },
		{ name: 'signature.ts', desc: 'Inverse sigmoid, power estimation, classification', status: 'done' },
		{ name: 'classification.ts', desc: 'Information tiers, adjusted thresholds (equipment/experience)', status: 'done' },
	];

	for (const m of modules) {
		checks.push({
			goal: `${m.name} — ${m.desc}`,
			verdict: m.status === 'done' ? 'PASS' : 'WARN',
			detail: m.status === 'done' ? 'Implemented and tested.' : 'Not yet implemented.',
		});
	}

	// Design doc features not yet in formulas
	const notYet = [
		{ feature: 'Active scan sweep model', doc: 'envelopes.md', desc: 'Sensor LFO sweep pattern, checkpoint-based detection with cumulative probability per sweep' },
		{ feature: 'Self-interference', doc: 'dsp.md', desc: 'Own-ship emissions degrade own sensor SNR (drive cooldown degrades scanning)' },
		{ feature: 'ECM/ECCM', doc: 'scanning.md', desc: 'Intentional noise injection and counter-measures' },
		{ feature: 'Signal processor addon', doc: 'scanning.md', desc: 'Correlator/amplifier/filter equipment modifying the signal chain' },
		{ feature: 'Filter tuning', doc: 'dsp.md', desc: 'Bandwidth, noise rejection, spectral focus as tunable parameters' },
		{ feature: 'Component drift', doc: 'envelopes.md', desc: 'Usage-based template sharpening (veteran sensors detect familiar signals better)' },
		{ feature: 'Chirp pattern fingerprinting', doc: 'dsp.md', desc: 'Drive frequency sweep rate as a unique identifier per drive model' },
		{ feature: 'Distance/range within system', doc: 'scanning.md', desc: 'Optional: spatial attenuation within a system abstraction' },
		{ feature: 'Information decay', doc: 'scanning.md', desc: 'Stale contacts lose confidence over time' },
	];

	for (const item of notYet) {
		checks.push({
			goal: `${item.feature} (${item.doc})`,
			verdict: 'INFO',
			detail: item.desc,
		});
	}

	return {
		title: 'Implementation Coverage — Formula Layer vs Design Docs',
		description: 'What\'s built, what\'s designed but not yet implemented.',
		checks,
	};
}

// ── Section 7: Tuning Health ─────────────────────────────────

function tuningHealth(): Section {
	const checks: Check[] = [];
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;

	// Check that the emission ranking makes gameplay sense
	const emissions = Object.entries(DEFAULT_EMISSION_PROFILES)
		.map(([type, profile]) => ({ type, power: profile.base }))
		.sort((a, b) => b.power - a.power);

	const top3 = emissions.slice(0, 3).map(e => e.type);
	checks.push({
		goal: 'Emission ranking: weapons > PNP > drive_spool (loudest = most aggressive actions)',
		verdict: top3[0] === 'weapons_fire' && top3[1] === 'pnp_scan' && top3[2] === 'drive_spool' ? 'PASS' : 'WARN',
		detail: `Top 3: ${emissions.slice(0, 3).map(e => `${e.type}=${e.power}`).join(', ')}. Bottom: ${emissions.slice(-3).map(e => `${e.type}=${e.power}`).join(', ')}.`,
	});

	// Integration gain at various durations — should show meaningful progression
	const rawSNR = snr(emissionPower('mining'), noise);
	const integrationPoints = [1, 2, 4, 8, 12, 24, 48].map(h => {
		const samples = Math.max(1, Math.floor(hours(h) / samplePeriod));
		return { hours: h, intSNR: r(integrationGain(rawSNR, samples)) };
	});
	checks.push({
		goal: 'Integration gain shows diminishing returns (√N scaling)',
		verdict: 'INFO',
		detail: `Raw SNR=${r(rawSNR)}. Integrated: ${integrationPoints.map(p => `${p.hours}hr=${p.intSNR}`).join(', ')}.`,
		values: Object.fromEntries(integrationPoints.map(p => [`${p.hours}hr`, p.intSNR])),
	});

	// Sigmoid transition zone — where does detection go from 10% to 90%?
	// We WANT a gradual zone (1.5-3.0 SNR width) — DSP influences probability,
	// it doesn't create binary pass/fail walls.
	const snr10 = invertSigmoid(0.1);
	const snr50 = invertSigmoid(0.5);
	const snr90 = invertSigmoid(0.9);
	const transitionWidth = snr90 - snr10;
	checks.push({
		goal: 'Sigmoid transition zone is gradual (no brick walls)',
		verdict: assess(transitionWidth >= 4.0 && transitionWidth <= 12.0, transitionWidth >= 2.0),
		detail: `10%=${r(snr10)}, 50%=${r(snr50)}, 90%=${r(snr90)}, width=${r(transitionWidth)}. Steepness=${DEFAULT_DSP_CONSTANTS.detectionSteepness}. Target: 4-12 width (very gradual).`,
		values: { snr10: r(snr10), snr50: r(snr50), snr90: r(snr90), width: r(transitionWidth) },
	});

	return {
		title: 'Tuning Health — Are the Numbers Right?',
		description: 'Validates that the constants produce reasonable gameplay characteristics.',
		checks,
	};
}

// ── Section 8: Envelope vs Sample Period — The Timing Problem ──

function envelopeTimingProblem(): Section {
	const checks: Check[] = [];
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const noise = noiseFloor(stellarNoise('G'), []);
	const baseEmission = DEFAULT_EMISSION_PROFILES.drive_spool.base;
	const DRIVE_KEYS = Object.keys(DEFAULT_DRIVE_ENVELOPES);

	// Spool durations are now minutes, sampling is 1-10 minutes.
	// The timing mismatch is manageable but still present — a fast scanner
	// catches more spools than a slow one.
	checks.push({
		goal: 'Spool-to-sample ratio: are spools catchable?',
		verdict: 'INFO',
		detail: `Sample period=${samplePeriod}s (${samplePeriod / 60}min). Spool durations: ${DRIVE_KEYS.map(k => `${DEFAULT_DRIVE_ENVELOPES[k].label}=${DEFAULT_DRIVE_ENVELOPES[k].spool.duration}s (${r(DEFAULT_DRIVE_ENVELOPES[k].spool.duration / 60, 1)}min)`).join(', ')}. Spool/sample ratio: ${r(DEFAULT_DRIVE_ENVELOPES['dr-705'].spool.duration / samplePeriod * 100, 0)}%-${r(DEFAULT_DRIVE_ENVELOPES['dr-505'].spool.duration / samplePeriod * 100, 0)}%.`,
		values: {
			samplePeriodS: samplePeriod,
			spoolDurations: Object.fromEntries(DRIVE_KEYS.map(k => [k, DEFAULT_DRIVE_ENVELOPES[k].spool.duration])),
		},
	});

	// If we model the spool as its average power over the sample period,
	// how does detectability change?
	for (const key of DRIVE_KEYS) {
		const env = DEFAULT_DRIVE_ENVELOPES[key];
		const totalEnvDuration = envelopeDuration(env);

		// Average envelope power across one sample period (envelope is much
		// shorter than the sample, so we're diluting the signal)
		const integrationSteps = 200;
		let powerSum = 0;
		for (let i = 0; i < integrationSteps; i++) {
			const t = (i / integrationSteps) * totalEnvDuration;
			powerSum += envelopeAt(t, env).power;
		}
		const avgEnvelopePower = (powerSum / integrationSteps) * baseEmission;

		// Diluted: the envelope only occupies a fraction of the sample period
		const dutyCycle = totalEnvDuration / samplePeriod;
		const avgPowerInSample = avgEnvelopePower * dutyCycle;

		// Detection using the peak (current model — treats spool as constant)
		const peakPower = envelopePeakPower(env) * baseEmission;
		const dsc = SENSOR_AFFINITIES.dsc;
		const gain = matchedFilterGain(dsc, 'pulse');

		const confAtPeak = passiveDetection(peakPower, noise, dsc.passive, samplePeriod, samplePeriod, gain, 0);
		const confAtAvg = passiveDetection(avgPowerInSample, noise, dsc.passive, samplePeriod, samplePeriod, gain, 0);

		checks.push({
			goal: `${env.label}: peak vs time-averaged detection`,
			verdict: confAtAvg < 0.01 && confAtPeak > 0.5 ? 'WARN' : 'INFO',
			detail: `Envelope avg power=${r(avgEnvelopePower)}, duty cycle=${pct(dutyCycle)}, diluted power=${r(avgPowerInSample)}. Peak conf=${pct(confAtPeak)}, time-avg conf=${pct(confAtAvg)}.`,
			values: {
				avgPower: r(avgEnvelopePower),
				dutyCycle: r(dutyCycle),
				dilutedPower: r(avgPowerInSample),
				peakConf: r(confAtPeak),
				avgConf: r(confAtAvg),
			},
		});
	}

	// What sample period WOULD be needed to catch the military spool?
	// The spool lasts 15s, so the sensor needs to sample within that window.
	const milEnv = DEFAULT_DRIVE_ENVELOPES['dr-705'];
	const milPeak = envelopePeakPower(milEnv) * baseEmission;
	const dsc = SENSOR_AFFINITIES.dsc;
	const gain = matchedFilterGain(dsc, 'pulse');
	const targetPeriods = [5, 10, 15, 30, 60, 300, 600, 1800];
	const periodResults: Array<{ period: number; conf: number }> = [];
	for (const p of targetPeriods) {
		const conf = passiveDetection(milPeak, noise, dsc.passive, p, p, gain, 0);
		periodResults.push({ period: p, conf: r(conf) });
	}
	checks.push({
		goal: 'What sample period catches a military spool at peak?',
		verdict: 'INFO',
		detail: periodResults.map(p => `${p.period}s=${pct(p.conf)}`).join(', '),
		values: Object.fromEntries(periodResults.map(p => [`${p.period}s`, p.conf])),
	});

	// The design implication — less severe now with minute-scale spools
	checks.push({
		goal: 'Design question: how does the engine observe transient spool events?',
		verdict: 'INFO',
		detail: `Spools are now ${DEFAULT_DRIVE_ENVELOPES['dr-705'].spool.duration / 60}-${DEFAULT_DRIVE_ENVELOPES['dr-505'].spool.duration / 60} minutes. With 5-min default sampling, a military spool occupies ${r(DEFAULT_DRIVE_ENVELOPES['dr-705'].spool.duration / samplePeriod * 100, 0)}% of a sample window. A 1-min scanner catches every spool. A 10-min scanner has a ${r(DEFAULT_DRIVE_ENVELOPES['dr-705'].spool.duration / 600 * 100, 0)}% chance. Scan frequency is now a meaningful tactical choice.`,
	});

	return {
		title: 'Envelope vs Sample Period — Scan Frequency Tradeoffs',
		description: 'Spool durations are minutes. Passive samples every 1-10 minutes. Faster scanning catches more transients.',
		checks,
	};
}

// ── Section 9: Self-Interference — Cooldown Degrades Scanning ──

function selfInterference(): Section {
	const checks: Check[] = [];
	const baseline = stellarNoise('G');
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const baseEmission = DEFAULT_EMISSION_PROFILES.drive_cooldown.base;
	const DRIVE_KEYS = Object.keys(DEFAULT_DRIVE_ENVELOPES);

	// A ship arrives and immediately wants to scan. Its own cooldown
	// emissions are part of the noise its sensor must filter through.
	for (const key of DRIVE_KEYS) {
		const env = DEFAULT_DRIVE_ENVELOPES[key];
		const cooldownStart = env.spool.duration + env.sustain.duration;

		// Evaluate self-emission at various points during cooldown
		const points = [0, 0.25, 0.5, 0.75, 1.0];
		const results: Record<string, unknown> = {};

		for (const frac of points) {
			const elapsed = cooldownStart + frac * env.cooldown.duration;
			const state = envelopeAt(elapsed, env);
			const selfEmission = state.power * baseEmission;

			// Noise floor with just self-interference vs clean
			const cleanNoise = noiseFloor(baseline, []);
			const dirtyNoise = noiseFloor(baseline, [selfEmission]);

			// Try to detect a miner (continuous signal) with the degraded sensor
			const miningPower = emissionPower('mining');
			const dsc = SENSOR_AFFINITIES.dsc;
			const contGain = matchedFilterGain(dsc, 'continuous');

			const cleanConf = passiveDetection(miningPower, cleanNoise, dsc.passive, hours(1), samplePeriod, contGain, 0);
			const dirtyConf = passiveDetection(miningPower, dirtyNoise, dsc.passive, hours(1), samplePeriod, contGain, 0);
			const degradation = cleanConf > 0 ? (cleanConf - dirtyConf) / cleanConf : 0;

			results[`${r(frac * 100, 0)}%`] = {
				selfPower: r(selfEmission),
				cleanConf: r(cleanConf),
				dirtyConf: r(dirtyConf),
				degradation: pct(degradation),
			};
		}

		checks.push({
			goal: `${env.label}: cooldown self-interference on scanning`,
			verdict: 'INFO',
			detail: `Self-emission during cooldown degrades own sensor. ${env.label} cooldown peak=${env.cooldown.peakPower * baseEmission}.`,
			values: results,
		});
	}

	// The practical question: should the pilot wait for cooldown to finish?
	// Use 2hr integration to compare below the cap — at 6hr both may cap.
	const milEnv = DEFAULT_DRIVE_ENVELOPES['dr-705'];
	const dsc = SENSOR_AFFINITIES.dsc;
	const contGain = matchedFilterGain(dsc, 'continuous');
	const miningPower = emissionPower('mining');

	const cleanNoise = noiseFloor(baseline, []);
	const milCooldownPeak = milEnv.cooldown.peakPower * baseEmission;
	const hotNoise = noiseFloor(baseline, [milCooldownPeak]);

	const cleanConf = passiveDetection(miningPower, cleanNoise, dsc.passive, hours(2), samplePeriod, contGain, 0);
	const hotConf = passiveDetection(miningPower, hotNoise, dsc.passive, hours(2), samplePeriod, contGain, 0);

	checks.push({
		goal: 'Military cooldown meaningfully degrades scanning (wait vs scan now)',
		verdict: assess(hotConf < cleanConf * 0.8, hotConf < cleanConf * 0.95),
		detail: `DSC detecting miner 2hr: clean=${pct(cleanConf)}, during DR-705 cooldown peak=${pct(hotConf)}. Self-emission=${milCooldownPeak}.`,
		values: { clean: r(cleanConf), hot: r(hotConf), selfEmission: milCooldownPeak },
	});

	// Civilian cooldown should barely affect scanning
	const civEnv = DEFAULT_DRIVE_ENVELOPES['dr-305'];
	const civCooldownPeak = civEnv.cooldown.peakPower * baseEmission;
	const civHotNoise = noiseFloor(baseline, [civCooldownPeak]);
	const civHotConf = passiveDetection(miningPower, civHotNoise, dsc.passive, hours(2), samplePeriod, contGain, 0);

	checks.push({
		goal: 'Civilian cooldown has less scan impact than military',
		verdict: civHotConf > hotConf ? 'PASS' : 'WARN',
		detail: `DSC detecting miner 2hr: clean=${pct(cleanConf)}, DR-305 cooldown=${pct(civHotConf)}, DR-705 cooldown=${pct(hotConf)}. Civilian degrades less than military.`,
		values: { clean: r(cleanConf), civHot: r(civHotConf), milHot: r(hotConf) },
	});

	return {
		title: 'Self-Interference — Cooldown Degrades Scanning',
		description: 'From dsp.md: own-ship emissions add to the noise the sensor must filter. Military drives arrive hot.',
		checks,
	};
}

// ── Section 10: Gameplay Scenarios — Does the Timing Work? ───

function gameplayScenarios(): Section {
	const checks: Check[] = [];
	const baseline = stellarNoise('G');
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;

	// Scenario 1: Wolf arrives, spools PNP. Miner detects PNP passively.
	// Question: does the miner get warning before the wolf's scan finishes?
	{
		// Wolf arrives, waits for cooldown, then starts PNP
		// But PNP is loud — detection should be instant
		const pnpPower = emissionPower('pnp_scan');
		const noise = noiseFloor(baseline, []);
		const vrs = SENSOR_AFFINITIES.vrs;

		const minerDetectsPNP = passiveDetection(pnpPower, noise, vrs.passive, samplePeriod, samplePeriod, 1.0, 0);

		// PNP detection builds over time with the wide sigmoid.
		// One sample gives awareness, sustained PNP gives confidence.
		const minerDetectsPNP3 = passiveDetection(pnpPower, noise, vrs.passive, samplePeriod * 3, samplePeriod, 1.0, 0);
		const minerDetectsPNP6 = passiveDetection(pnpPower, noise, vrs.passive, samplePeriod * 6, samplePeriod, 1.0, 0);

		checks.push({
			goal: 'Miner detects wolf PNP scan (builds confidence over samples)',
			verdict: assess(minerDetectsPNP6 >= 0.7, minerDetectsPNP6 > 0.4),
			detail: `Wolf PNP (power=${pnpPower}). VRS: 1 sample=${pct(minerDetectsPNP)}, 3 samples (${samplePeriod * 3 / 60}min)=${pct(minerDetectsPNP3)}, 6 samples (${samplePeriod * 6 / 60}min)=${pct(minerDetectsPNP6)}. Awareness builds, not instant.`,
			values: { pnpPower, conf1: r(minerDetectsPNP), conf3: r(minerDetectsPNP3), conf6: r(minerDetectsPNP6), sampleMinutes: samplePeriod / 60 },
		});
	}

	// Scenario 2: Wolf pack — 3 wolves PNP scanning simultaneously.
	// How much do they raise the noise floor for each other?
	{
		const pnpPower = emissionPower('pnp_scan');
		const noise1wolf = noiseFloor(baseline, [pnpPower]);
		const noise3wolves = noiseFloor(baseline, [pnpPower, pnpPower, pnpPower]);
		const noiseClean = noiseFloor(baseline, []);

		// Each wolf's own PNP adds to noise for detecting OTHER things
		// But the miner sees ALL their PNP emissions
		const minerSignal = emissionPower('mining');
		const dsc = SENSOR_AFFINITIES.dsc;
		const contGain = matchedFilterGain(dsc, 'continuous');

		const minerVs1wolf = passiveDetection(minerSignal, noise1wolf, dsc.passive, hours(6), samplePeriod, contGain, 0);
		const minerVs3wolves = passiveDetection(minerSignal, noise3wolves, dsc.passive, hours(6), samplePeriod, contGain, 0);
		const minerVsClean = passiveDetection(minerSignal, noiseClean, dsc.passive, hours(6), samplePeriod, contGain, 0);

		checks.push({
			goal: 'Wolf pack PNP raises noise floor, partially masking other signals',
			verdict: minerVs3wolves < minerVsClean ? 'PASS' : 'FAIL',
			detail: `DSC finding miner (6hr): clean=${pct(minerVsClean)}, 1 wolf PNP=${pct(minerVs1wolf)}, 3 wolf PNP=${pct(minerVs3wolves)}. Wolf pack noise helps hide the miner.`,
			values: { clean: r(minerVsClean), wolf1: r(minerVs1wolf), wolf3: r(minerVs3wolves) },
		});

		// But the miner also detects the wolves more easily
		const pulseGain = matchedFilterGain(SENSOR_AFFINITIES.vrs, 'pulse');
		// The miner's VRS sees 3x PNP emission as RMS: sqrt(3) * pnpPower
		const totalWolfSignal = Math.sqrt(3) * pnpPower;
		const minerDetectsPackInstant = passiveDetection(totalWolfSignal, noiseClean, 1.0, samplePeriod, samplePeriod, pulseGain, 0);
		const minerDetectsPack15min = passiveDetection(totalWolfSignal, noiseClean, 1.0, samplePeriod * 3, samplePeriod, pulseGain, 0);
		checks.push({
			goal: 'Wolf pack is LOUDER than solo wolf (RMS scaling)',
			verdict: minerDetectsPack15min >= 0.5 ? 'PASS' : 'WARN',
			detail: `3-wolf PNP signal (RMS)=${r(totalWolfSignal)} vs solo=${pnpPower}. 1 sample=${pct(minerDetectsPackInstant)}, 15min=${pct(minerDetectsPack15min)}. Pack can't sneak for long.`,
			values: { soloPower: pnpPower, packPower: r(totalWolfSignal), conf1: r(minerDetectsPackInstant), conf15m: r(minerDetectsPack15min) },
		});
	}

	// Scenario 3: Miner sees a drive spool on passive.
	// How long does the miner have before the ship arrives?
	// Answer: the miner sees the spool in the ORIGIN system.
	// The spool duration IS the warning window.
	{
		const DRIVE_KEYS = Object.keys(DEFAULT_DRIVE_ENVELOPES);
		for (const key of DRIVE_KEYS) {
			const env = DEFAULT_DRIVE_ENVELOPES[key];

			// Time from spool start to jump completion = spool duration
			// This is the miner's warning window to flee
			const warningWindow = env.spool.duration;

			// Can the miner detect the spool within the warning window?
			// The spool is a transient pulse. If sampling every 30 minutes,
			// the spool will usually be missed entirely.
			const catchProbability = Math.min(1, warningWindow / samplePeriod);

			checks.push({
				goal: `${env.label}: spool warning window for flee decision`,
				verdict: assess(catchProbability > 0.5, catchProbability > 0.2),
				detail: `Spool lasts ${warningWindow}s (${r(warningWindow / 60, 1)}min). Sample period=${samplePeriod}s (${samplePeriod / 60}min). Catch probability: ${pct(catchProbability)}.`,
				values: { warningWindowS: warningWindow, samplePeriodS: samplePeriod, catchProbability: r(catchProbability) },
			});
		}
	}

	// Scenario 4: The busy system — 10 miners, 2 wolves, 1 ECM.
	// Does the noise floor become unplayable?
	{
		const minerEmissions = Array(10).fill(emissionPower('mining')) as number[];
		const wolfEmissions = [emissionPower('pnp_scan'), emissionPower('pnp_scan')];
		const ecmNoise = 3.5; // ECM at base power
		const noise = noiseFloor(baseline, [...minerEmissions, ...wolfEmissions], 0, ecmNoise);

		const dsc = SENSOR_AFFINITIES.dsc;
		const contGain = matchedFilterGain(dsc, 'continuous');
		const pulseGain = matchedFilterGain(dsc, 'pulse');

		// Can DSC still find a miner in this chaos?
		const minerConf = passiveDetection(emissionPower('mining'), noise, dsc.passive, hours(6), samplePeriod, contGain, 0);
		// Can VRS detect the wolves?
		const wolfConf = passiveDetection(emissionPower('pnp_scan'), noise, 1.0, samplePeriod, samplePeriod, pulseGain, 0);

		// In a noisy system, detection takes longer but shouldn't be impossible
		const wolfConf30m = passiveDetection(emissionPower('pnp_scan'), noise, 1.0, samplePeriod * 6, samplePeriod, pulseGain, 0);
		checks.push({
			goal: 'Busy system (10 miners + 2 wolves + ECM): detection is degraded but works',
			verdict: wolfConf30m > 0.1 ? 'PASS' : 'WARN',
			detail: `Noise floor=${r(noise)} (baseline=${baseline}). Miner detection (DSC 6hr): ${pct(minerConf)}. Wolf PNP (VRS 1 sample): ${pct(wolfConf)}, 30min: ${pct(wolfConf30m)}.`,
			values: { noiseFloor: r(noise), minerConf: r(minerConf), wolfConf1: r(wolfConf), wolfConf30m: r(wolfConf30m) },
		});
	}

	// Scenario 5: Two ships in same system, different envelope phases.
	// Timestamp model means their envelopes are independent.
	{
		const milEnv = DEFAULT_DRIVE_ENVELOPES['dr-705'];
		const civEnv = DEFAULT_DRIVE_ENVELOPES['dr-305'];
		const baseEM = DEFAULT_EMISSION_PROFILES.drive_spool.base;

		// Ship A started spooling 5s ago, Ship B started 40s ago
		const stateA = envelopeAt(5, milEnv);
		const stateB = envelopeAt(40, civEnv);

		const emissionA = stateA.power * baseEM;
		const emissionB = stateB.power * baseEM;

		// Combined noise from both
		const totalNoise = noiseFloor(baseline, [emissionA, emissionB]);

		checks.push({
			goal: 'Two ships, independent envelope phases — noise floor computed at shared timestamp',
			verdict: 'INFO',
			detail: `DR-705 at 5s (${stateA.phase}): emission=${r(emissionA)}. DR-305 at 40s (${stateB.phase}): emission=${r(emissionB)}. Combined noise floor=${r(totalNoise)}.`,
			values: {
				shipA: { elapsed: 5, phase: stateA.phase, emission: r(emissionA) },
				shipB: { elapsed: 40, phase: stateB.phase, emission: r(emissionB) },
				combinedNoise: r(totalNoise),
			},
		});
	}

	return {
		title: 'Gameplay Scenarios — Does the Timing Work?',
		description: 'Real gameplay situations stress-tested against the timestamp model. Wolves, miners, wolf packs, busy systems.',
		checks,
	};
}

// ── Main ─────────────────────────────────────────────────────

export function dspProgress(): void {
	const sections = [
		submarineWarfare(),
		sensorDifferentiation(),
		driveEnvelopes(),
		signatureAnalysis(),
		informationHierarchy(),
		informationTiers(),
		envelopeTimingProblem(),
		selfInterference(),
		gameplayScenarios(),
		implementationCoverage(),
		tuningHealth(),
	];

	// Summary stats
	let pass = 0, warn = 0, fail = 0, info = 0;
	for (const s of sections) {
		for (const c of s.checks) {
			switch (c.verdict) {
				case 'PASS': pass++; break;
				case 'WARN': warn++; break;
				case 'FAIL': fail++; break;
				case 'INFO': info++; break;
			}
		}
	}

	const output = {
		generated: new Date().toISOString(),
		summary: { pass, warn, fail, info, total: pass + warn + fail + info },
		sections: sections.map(s => ({
			title: s.title,
			description: s.description,
			checks: s.checks,
		})),
	};

	console.log(JSON.stringify(output, null, 2)); // eslint-disable-line no-console
}
