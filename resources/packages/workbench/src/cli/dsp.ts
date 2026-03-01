import type {
	EmissionType,
	EmissionProfile,
	SensorAffinity,
	DSPConstants,
 EmissionSource, Detection } from '@helm/formulas';
import {
	DEFAULT_EMISSION_PROFILES,
	DEFAULT_DSP_CONSTANTS,
	DEFAULT_DRIVE_ENVELOPES,
	DEFAULT_TIER_THRESHOLDS,
	SENSOR_AFFINITIES,
	emissionPower,
	tunedEmission,
	stellarNoise,
	noiseFloor,
	snr,
	maskedSNR,
	integrationGain,
	detectionProbability,
	cumulativeDetection,
	matchedFilterGain,
	passiveReport,
	passiveDetection,
	envelopeAt,
	envelopeTimeSeries,
	envelopePeakPower,
	estimateEmissionPower,
	classifyEmission,
	informationTier,
	adjustedThresholds,
} from '@helm/formulas';

// ── Output types ─────────────────────────────────────────────

interface DSPScenario {
	name: string;
	description: string;
	input: Record<string, unknown>;
	output: Record<string, unknown>;
}

interface DSPCategory {
	category: string;
	description: string;
	scenarios: DSPScenario[];
}

interface DSPAnalysis {
	generated: string;
	constants: DSPConstants;
	emissionProfiles: Record<EmissionType, EmissionProfile>;
	sensorAffinities: Record<string, SensorAffinity>;
	categories: DSPCategory[];
}

// ── Helpers ──────────────────────────────────────────────────

const EMISSION_TYPES = Object.keys(DEFAULT_EMISSION_PROFILES) as EmissionType[];
const SPECTRAL_CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'] as const;
const SENSOR_KEYS = Object.keys(SENSOR_AFFINITIES); // acu, vrs, dsc

const PASSIVE_THRESHOLD = DEFAULT_DSP_CONSTANTS.detectionThreshold;
const ACTIVE_THRESHOLD = DEFAULT_DSP_CONSTANTS.activeThreshold;

import { r } from '../format';

function hours(h: number): number {
	return h * 3600;
}

// ── Category 1: Emission Profiles ────────────────────────────

function emissionProfiles(): DSPCategory {
	const scenarios: DSPScenario[] = EMISSION_TYPES.map((type) => {
		const base = emissionPower(type);
		const tuned = tunedEmission(base, 2.0);
		const profile = DEFAULT_EMISSION_PROFILES[type];

		return {
			name: type,
			description: `${profile.spectralType} emission. Base=${base}, at effort 2.0=${tuned}.`,
			input: { emissionType: type, spectralType: profile.spectralType },
			output: {
				basePower: r(base),
				tunedPower_2x: r(tuned),
				spectralType: profile.spectralType,
			},
		};
	});

	// Sort by base power descending for ranking visibility
	scenarios.sort(
		(a, b) => (b.output.basePower as number) - (a.output.basePower as number),
	);

	return {
		category: 'Emission Profiles',
		description:
			'All 13 emission types at default and tuned (effort 2.0). Sorted by power — validates the ranking: weapons > PNP > drive spool > ... > idle.',
		scenarios,
	};
}

// ── Category 2: Stellar Noise ────────────────────────────────

function stellarNoiseCategory(): DSPCategory {
	return {
		category: 'Stellar Noise',
		description:
			'Baseline noise for all spectral classes (O through M). Shows how star choice affects the noise floor.',
		scenarios: SPECTRAL_CLASSES.map((cls) => {
			const noise = stellarNoise(cls);
			return {
				name: `${cls}-class`,
				description: `Stellar noise = ${noise}. ${cls === 'G' ? 'Reference level (1.0).' : ''}`,
				input: { stellarClass: cls },
				output: { noise: r(noise) },
			};
		}),
	};
}

// ── Category 3: Noise Floor Composition ──────────────────────

function noiseFloorComposition(): DSPCategory {
	const baseline = stellarNoise('G');
	const minerEmission = emissionPower('mining'); // 1.0 each
	const counts = [0, 1, 5, 10, 25, 50, 100];

	return {
		category: 'Noise Floor Composition',
		description:
			'G-class system, varying ship counts (active miners). RMS model: 100 miners = 10x ship noise, not 100x. Validates scaling to busy systems.',
		scenarios: counts.map((count) => {
			const emissions = Array(count).fill(minerEmission) as number[];
			const floor = noiseFloor(baseline, emissions);
			const shipRMS = Math.sqrt(count) * minerEmission;
			return {
				name: `${count} miners`,
				description: `Stellar=${baseline}, ${count} miners at ${minerEmission} each. RMS ship noise=${r(shipRMS)}.`,
				input: {
					stellarClass: 'G',
					minerCount: count,
					emissionPerMiner: minerEmission,
				},
				output: {
					stellarNoise: r(baseline),
					shipNoiseRMS: r(shipRMS),
					totalFloor: r(floor),
					floorMultiplier: r(floor / baseline),
				},
			};
		}),
	};
}

// ── Category 4: SNR Scenarios ────────────────────────────────

function snrScenarios(): DSPCategory {
	const quietNoise = noiseFloor(stellarNoise('M'), []);
	const normalNoise = noiseFloor(stellarNoise('G'), []);
	const busyNoise = noiseFloor(stellarNoise('G'), [1.0, 1.0, 1.0, 1.0, 1.0]);
	const crowdedNoise = noiseFloor(stellarNoise('G'), Array(100).fill(1.0) as number[]);

	const pnp = emissionPower('pnp_scan');
	const mining = emissionPower('mining');
	const shield = emissionPower('shield_regen');

	const scenarios: DSPScenario[] = [
		{
			name: 'PNP in quiet system (M-class, empty)',
			description: 'Loudest scan in quietest environment.',
			input: { signal: 'pnp_scan', signalPower: pnp, noise: r(quietNoise) },
			output: {
				snr: r(snr(pnp, quietNoise)),
				activeDetection: r(detectionProbability(snr(pnp, quietNoise), ACTIVE_THRESHOLD)),
				passiveInstant: r(detectionProbability(snr(pnp, quietNoise), PASSIVE_THRESHOLD)),
			},
		},
		{
			name: 'PNP in normal system (G-class, empty)',
			description: 'PNP in Sol-like system.',
			input: { signal: 'pnp_scan', signalPower: pnp, noise: r(normalNoise) },
			output: {
				snr: r(snr(pnp, normalNoise)),
				activeDetection: r(detectionProbability(snr(pnp, normalNoise), ACTIVE_THRESHOLD)),
				passiveInstant: r(detectionProbability(snr(pnp, normalNoise), PASSIVE_THRESHOLD)),
			},
		},
		{
			name: 'PNP in busy system (G-class, 5 miners)',
			description: 'PNP with background ship traffic. RMS noise model.',
			input: { signal: 'pnp_scan', signalPower: pnp, noise: r(busyNoise) },
			output: {
				snr: r(snr(pnp, busyNoise)),
				activeDetection: r(detectionProbability(snr(pnp, busyNoise), ACTIVE_THRESHOLD)),
				passiveInstant: r(detectionProbability(snr(pnp, busyNoise), PASSIVE_THRESHOLD)),
			},
		},
		{
			name: 'PNP in crowded system (G-class, 100 miners)',
			description: 'PNP in a major hub. Can active scanning still find it?',
			input: { signal: 'pnp_scan', signalPower: pnp, noise: r(crowdedNoise) },
			output: {
				snr: r(snr(pnp, crowdedNoise)),
				activeDetection: r(detectionProbability(snr(pnp, crowdedNoise), ACTIVE_THRESHOLD)),
				passiveInstant: r(detectionProbability(snr(pnp, crowdedNoise), PASSIVE_THRESHOLD)),
			},
		},
		{
			name: 'Miner in open space (G-class, empty)',
			description: 'Lone miner with no masking. Moderate signal.',
			input: { signal: 'mining', signalPower: mining, noise: r(normalNoise) },
			output: {
				snr: r(snr(mining, normalNoise)),
				activeDetection: r(detectionProbability(snr(mining, normalNoise), ACTIVE_THRESHOLD)),
				passiveInstant: r(detectionProbability(snr(mining, normalNoise), PASSIVE_THRESHOLD)),
			},
		},
		{
			name: 'Miner in belt (G-class, belt masking 2.0)',
			description: 'Belt noise correlates with mining emissions — harder to separate.',
			input: { signal: 'mining', signalPower: mining, noise: r(normalNoise), maskingNoise: 2.0 },
			output: {
				snr: r(maskedSNR(mining, normalNoise, 2.0)),
				activeDetection: r(detectionProbability(maskedSNR(mining, normalNoise, 2.0), ACTIVE_THRESHOLD)),
				passiveInstant: r(detectionProbability(maskedSNR(mining, normalNoise, 2.0), PASSIVE_THRESHOLD)),
			},
		},
		{
			name: 'Shield regen (G-class, empty)',
			description: 'Weakest non-idle emission. Needs long integration.',
			input: { signal: 'shield_regen', signalPower: shield, noise: r(normalNoise) },
			output: {
				snr: r(snr(shield, normalNoise)),
				activeDetection: r(detectionProbability(snr(shield, normalNoise), ACTIVE_THRESHOLD)),
				passiveInstant: r(detectionProbability(snr(shield, normalNoise), PASSIVE_THRESHOLD)),
			},
		},
	];

	return {
		category: 'SNR Scenarios',
		description:
			'Key gameplay signal/noise pairings. Shows raw SNR, active detection (threshold=1), and passive instant detection (threshold=4).',
		scenarios,
	};
}

// ── Category 5: Detection Curves ─────────────────────────────

function detectionCurves(): DSPCategory {
	const steepness = DEFAULT_DSP_CONSTANTS.detectionSteepness;

	// Sweep 0 to 3x passive threshold in 0.5 steps
	const maxSNR = PASSIVE_THRESHOLD * 3;
	const snrValues: number[] = [];
	for (let s = 0; s <= maxSNR; s += 0.5) {
		snrValues.push(r(s, 2));
	}

	return {
		category: 'Detection Curves',
		description: `Both sigmoids: active (threshold=${ACTIVE_THRESHOLD}) and passive (threshold=${PASSIVE_THRESHOLD}). Steepness=${steepness}. Shows the different transition zones.`,
		scenarios: snrValues.map((s) => ({
			name: `SNR=${s}`,
			description: `Active and passive detection probability at SNR=${s}.`,
			input: { snr: s },
			output: {
				activeP: r(detectionProbability(s, ACTIVE_THRESHOLD, steepness)),
				passiveP: r(detectionProbability(s, PASSIVE_THRESHOLD, steepness)),
			},
		})),
	};
}

// ── Category 6: Active Scan Accumulation ─────────────────────

function activeScanAccumulation(): DSPCategory {
	const signal = emissionPower('mining');
	const noise = noiseFloor(stellarNoise('G'), []);
	const sweepCounts = [1, 2, 3, 4, 6, 8, 10, 15, 20];

	const scenarios: DSPScenario[] = [];

	for (const sensorKey of SENSOR_KEYS) {
		const affinity = SENSOR_AFFINITIES[sensorKey];
		const effectiveSignal = signal * affinity.active;
		const rawSNR = snr(effectiveSignal, noise);
		const gain = matchedFilterGain(affinity, 'continuous');
		const effectiveSNR = rawSNR * gain;
		const perSweep = detectionProbability(effectiveSNR, ACTIVE_THRESHOLD);

		scenarios.push({
			name: `${sensorKey} — sweep accumulation`,
			description: `Per-sweep P=${r(perSweep)} (active threshold=${ACTIVE_THRESHOLD}). Active affinity=${affinity.active}, continuousGain=${affinity.continuousGain}.`,
			input: {
				sensor: sensorKey,
				target: 'mining',
				signalPower: signal,
				noise: r(noise),
				effectiveSNR: r(effectiveSNR),
				perSweepChance: r(perSweep),
			},
			output: Object.fromEntries(
				sweepCounts.map((n) => [`sweeps_${n}`, r(cumulativeDetection(perSweep, n))]),
			),
		});
	}

	return {
		category: 'Active Scan Accumulation',
		description:
			`Per-sweep probability (active threshold=${ACTIVE_THRESHOLD}) × sweep count (1-20) for each sensor against a miner in G-class.`,
		scenarios,
	};
}

// ── Category 7: Passive Integration Over Time ────────────────

function passiveIntegration(): DSPCategory {
	const signal = emissionPower('mining');
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const durations = [
		{ label: '30min', seconds: hours(0.5) },
		{ label: '1hr', seconds: hours(1) },
		{ label: '2hr', seconds: hours(2) },
		{ label: '4hr', seconds: hours(4) },
		{ label: '6hr', seconds: hours(6) },
		{ label: '8hr', seconds: hours(8) },
		{ label: '12hr', seconds: hours(12) },
		{ label: '24hr', seconds: hours(24) },
		{ label: '48hr', seconds: hours(48) },
	];

	const scenarios: DSPScenario[] = [];

	for (const sensorKey of SENSOR_KEYS) {
		const affinity = SENSOR_AFFINITIES[sensorKey];
		const gain = matchedFilterGain(affinity, 'continuous');

		const results: Record<string, number> = {};
		for (const { label, seconds } of durations) {
			const rawSNR = snr(signal * affinity.passive, noise);
			const samples = Math.max(1, Math.floor(seconds / samplePeriod));
			const integrated = integrationGain(rawSNR, samples);
			const filtered = integrated * gain;
			results[label] = r(detectionProbability(filtered));
		}

		scenarios.push({
			name: `${sensorKey} — passive integration`,
			description: `Passive affinity=${affinity.passive}, continuousGain=${affinity.continuousGain}. Watching a miner over time.`,
			input: {
				sensor: sensorKey,
				target: 'mining',
				signalPower: signal,
				noise: r(noise),
				samplePeriodSeconds: samplePeriod,
			},
			output: results,
		});
	}

	return {
		category: 'Passive Integration Over Time',
		description:
			`Miner in G-class integrated over 30min to 48hr for each sensor. Sample period=${samplePeriod}s. Passive threshold=${PASSIVE_THRESHOLD}. The core "check back later" mechanic.`,
		scenarios,
	};
}

// ── Category 8: Sensor Comparison ────────────────────────────

function sensorComparison(): DSPCategory {
	const noise = noiseFloor(stellarNoise('G'), []);
	const integrationTime = hours(6); // 6 hours — meaningful passive window

	const sources: EmissionSource[] = [
		{ power: emissionPower('pnp_scan'), spectralType: 'pulse', label: 'pnp_scan' },
		{ power: emissionPower('drive_spool'), spectralType: 'pulse', label: 'drive_spool' },
		{ power: emissionPower('mining'), spectralType: 'continuous', label: 'mining' },
		{ power: emissionPower('shield_regen'), spectralType: 'continuous', label: 'shield_regen' },
		{ power: emissionPower('belt_scan'), spectralType: 'sweep', label: 'belt_scan' },
	];

	return {
		category: 'Sensor Comparison',
		description:
			'All 3 sensors against the same mixed emission sources (6hr integration, G-class). The core gameplay differentiation test.',
		scenarios: SENSOR_KEYS.map((sensorKey) => {
			const affinity = SENSOR_AFFINITIES[sensorKey];
			const detections = passiveReport(sources, noise, affinity, integrationTime);

			return {
				name: sensorKey,
				description: `passive=${affinity.passive}, pulseGain=${affinity.pulseGain}, continuousGain=${affinity.continuousGain}, pvpGain=${affinity.pvpGain}.`,
				input: {
					sensor: sensorKey,
					integrationSeconds: integrationTime,
					noise: r(noise),
					sources: sources.map((s) => ({ label: s.label, power: s.power, spectralType: s.spectralType })),
				},
				output: {
					detections: detections.map((d: Detection) => ({
						label: d.label,
						confidence: r(d.confidence),
					})),
					detectedCount: detections.length,
					totalSources: sources.length,
				},
			};
		}),
	};
}

// ── Category 9: Miner-in-Belt Deep Dive ─────────────────────

function minerInBelt(): DSPCategory {
	const signal = emissionPower('mining');
	const baseline = stellarNoise('G');
	const noise = noiseFloor(baseline, []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;

	const beltMaskingValues = [0, 1.0, 2.0, 3.0, 5.0];
	const integrationHours = [2, 4, 6, 8, 12, 24, 48];

	const scenarios: DSPScenario[] = [];

	for (const sensorKey of SENSOR_KEYS) {
		const affinity = SENSOR_AFFINITIES[sensorKey];
		const gain = matchedFilterGain(affinity, 'continuous');

		for (const masking of beltMaskingValues) {
			const results: Record<string, number> = {};

			for (const h of integrationHours) {
				const seconds = hours(h);
				const rawSNR = masking > 0
					? maskedSNR(signal * affinity.passive, noise, masking)
					: snr(signal * affinity.passive, noise);
				const samples = Math.max(1, Math.floor(seconds / samplePeriod));
				const integrated = integrationGain(rawSNR, samples);
				const filtered = integrated * gain;
				results[`${h}hr`] = r(detectionProbability(filtered));
			}

			scenarios.push({
				name: `${sensorKey} / masking=${masking}`,
				description: `${sensorKey} sensor, belt masking=${masking}. ${masking === 0 ? 'Open space (no belt).' : `Belt density correlates with mining at ${masking}x noise.`}`,
				input: {
					sensor: sensorKey,
					target: 'mining',
					signalPower: signal,
					noise: r(noise),
					maskingNoise: masking,
				},
				output: results,
			});
		}
	}

	return {
		category: 'Miner-in-Belt Deep Dive',
		description:
			'The signature scenario. Varies belt masking (0-5.0), integration time (2-48hr), sensor type. Is belt mining meaningfully safer?',
		scenarios,
	};
}

// ── Category 10: Drive Envelope Shapes ───────────────────────

function driveEnvelopeShapes(): DSPCategory {
	const DRIVE_KEYS = Object.keys(DEFAULT_DRIVE_ENVELOPES);

	return {
		category: 'Drive Envelope Shapes',
		description:
			'All 3 drive classes × spool/sustain/cooldown time series. Military\'s brutal attack spike vs civilian\'s gentle warmup.',
		scenarios: DRIVE_KEYS.map((key) => {
			const envelope = DEFAULT_DRIVE_ENVELOPES[key];
			const series = envelopeTimeSeries(envelope, 60);
			const peak = envelopePeakPower(envelope);

			return {
				name: envelope.label,
				description: `Peak=${peak}. Spool: ${envelope.spool.duration}s curve=${envelope.spool.curve}. Sustain: ${envelope.sustain.peakPower}. Cooldown: ${envelope.cooldown.duration}s curve=${envelope.cooldown.curve}.`,
				input: {
					drive: key,
					spool: envelope.spool,
					sustain: envelope.sustain,
					cooldown: envelope.cooldown,
				},
				output: {
					peakPower: peak,
					totalDuration: envelope.spool.duration + envelope.sustain.duration + envelope.cooldown.duration,
					timeSeries: series.map((s) => ({
						t: r(s.t, 1),
						phase: s.phase,
						power: r(s.power),
					})),
				},
			};
		}),
	};
}

// ── Category 11: Envelope Detection Timeline ─────────────────

function envelopeDetectionTimeline(): DSPCategory {
	const DRIVE_KEYS = Object.keys(DEFAULT_DRIVE_ENVELOPES);
	const noise = noiseFloor(stellarNoise('G'), []);
	const dsc = SENSOR_AFFINITIES.dsc;
	const gain = matchedFilterGain(dsc, 'pulse'); // drive spool is pulse-type
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const baseEmission = DEFAULT_EMISSION_PROFILES.drive_spool.base;
	const steps = 20;

	return {
		category: 'Envelope Detection Timeline',
		description:
			'DSC sensor watching each drive class spool. When does the spool become detectable? Military crosses threshold fast; civilian creeps up gradually.',
		scenarios: DRIVE_KEYS.map((key) => {
			const envelope = DEFAULT_DRIVE_ENVELOPES[key];
			const spoolDuration = envelope.spool.duration;
			const timeline: Array<{ t: number; phase: string; power: number; confidence: number }> = [];

			for (let i = 0; i <= steps; i++) {
				const t = (i / steps) * spoolDuration;
				const state = envelopeAt(t, envelope);
				const power = state.power * baseEmission;
				const confidence = passiveDetection(
					power, noise, dsc.passive, samplePeriod, samplePeriod, gain, 0,
				);
				timeline.push({ t: r(t, 1), phase: state.phase, power: r(power), confidence: r(confidence) });
			}

			// Find first time step where confidence > 0.5
			const crossover = timeline.find((s) => s.confidence >= 0.5);

			return {
				name: envelope.label,
				description: `Spool duration=${spoolDuration}s. ${crossover ? `Crosses 50% at ~${crossover.t}s.` : 'Never crosses 50% during spool.'}`,
				input: {
					drive: key,
					sensor: 'dsc',
					noise: r(noise),
					baseEmission,
				},
				output: {
					crossoverTime: crossover ? crossover.t : null,
					timeline,
				},
			};
		}),
	};
}

// ── Category 12: Signature Power Estimation ──────────────────

function signaturePowerEstimation(): DSPCategory {
	const noise = noiseFloor(stellarNoise('G'), []);
	const dsc = SENSOR_AFFINITIES.dsc;
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;

	const observations = [
		{
			name: 'Loud PNP scan',
			power: emissionPower('pnp_scan'),
			spectralType: 'pulse' as const,
			integration: hours(1),
			masking: 0,
		},
		{
			name: 'Quiet miner (open space)',
			power: emissionPower('mining'),
			spectralType: 'continuous' as const,
			integration: hours(6),
			masking: 0,
		},
		{
			name: 'Masked belt miner',
			power: emissionPower('mining'),
			spectralType: 'continuous' as const,
			integration: hours(12),
			masking: 2.0,
		},
		{
			name: 'Military drive spool',
			power: emissionPower('drive_spool') * DEFAULT_DRIVE_ENVELOPES['dr-705'].spool.peakPower,
			spectralType: 'pulse' as const,
			integration: hours(1),
			masking: 0,
		},
	];

	return {
		category: 'Signature Power Estimation',
		description:
			'Round-trip accuracy test: emit → detect → estimate → classify. Given known observations, can we recover the source and identify the activity?',
		scenarios: observations.map((obs) => {
			const gain = matchedFilterGain(dsc, obs.spectralType);

			// Forward: compute detection confidence
			const confidence = passiveDetection(
				obs.power, noise, dsc.passive, obs.integration, samplePeriod, gain, obs.masking,
			);

			// Inverse: estimate power from confidence
			const estimated = estimateEmissionPower(
				confidence, noise, dsc.passive, obs.integration, samplePeriod, gain, obs.masking,
			);

			// Classify: what does this power level look like?
			const classification = classifyEmission(estimated);
			const top3 = classification.slice(0, 3);

			return {
				name: obs.name,
				description: `True power=${r(obs.power)}. Confidence=${r(confidence)}. Estimated=${r(estimated)}. Error=${r(Math.abs(estimated - obs.power))}.`,
				input: {
					truePower: r(obs.power),
					spectralType: obs.spectralType,
					integrationHours: obs.integration / 3600,
					maskingNoise: obs.masking,
					sensor: 'dsc',
				},
				output: {
					confidence: r(confidence),
					estimatedPower: r(estimated),
					absoluteError: r(Math.abs(estimated - obs.power)),
					topClassifications: top3.map((c) => ({
						type: c.type,
						distance: r(c.distance),
					})),
				},
			};
		}),
	};
}

// ── Category 13: Drive Classification from Envelope ──────────

function driveClassification(): DSPCategory {
	const DRIVE_KEYS = Object.keys(DEFAULT_DRIVE_ENVELOPES);
	const noise = noiseFloor(stellarNoise('G'), []);
	const dsc = SENSOR_AFFINITIES.dsc;
	const gain = matchedFilterGain(dsc, 'pulse');
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const baseEmission = DEFAULT_EMISSION_PROFILES.drive_spool.base;

	// Build drive profiles for classification: peak emission power per drive
	const driveProfiles: Record<string, { base: number; spectralType: 'pulse' }> = {};
	for (const key of DRIVE_KEYS) {
		const envelope = DEFAULT_DRIVE_ENVELOPES[key];
		driveProfiles[key] = {
			base: envelopePeakPower(envelope) * baseEmission,
			spectralType: 'pulse',
		};
	}

	return {
		category: 'Drive Classification from Envelope',
		description:
			'Observe each drive spool\'s peak emission, estimate its power, classify against the 3 drive profiles. Can you tell a military drive from a civilian drive by its signature?',
		scenarios: DRIVE_KEYS.map((key) => {
			const envelope = DEFAULT_DRIVE_ENVELOPES[key];
			const peakPower = envelopePeakPower(envelope) * baseEmission;

			// Detect at peak emission
			const confidence = passiveDetection(
				peakPower, noise, dsc.passive, samplePeriod, samplePeriod, gain, 0,
			);

			// Estimate power from the detection
			const estimated = estimateEmissionPower(
				confidence, noise, dsc.passive, samplePeriod, samplePeriod, gain, 0,
			);

			// Classify against drive profiles
			const classification = classifyEmission(estimated, driveProfiles);

			return {
				name: `Observing ${envelope.label}`,
				description: `Peak emission=${r(peakPower)}. Confidence=${r(confidence)}. Can the observer identify the drive class?`,
				input: {
					drive: key,
					truePeakPower: r(peakPower),
					sensor: 'dsc',
					noise: r(noise),
				},
				output: {
					confidence: r(confidence),
					estimatedPower: r(estimated),
					classification: classification.map((c) => ({
						drive: c.type,
						distance: r(c.distance),
					})),
					correctlyIdentified: classification[0].type === key,
				},
			};
		}),
	};
}

// ── Category 14: Information Tiers ───────────────────────────

function informationTierScenarios(): DSPCategory {
	const noise = noiseFloor(stellarNoise('G'), []);
	const samplePeriod = DEFAULT_DSP_CONSTANTS.samplePeriodSeconds;
	const dsc = SENSOR_AFFINITIES.dsc;
	const vrs = SENSOR_AFFINITIES.vrs;

	const scenarios: DSPScenario[] = [];

	// Tier progression over time for a miner (DSC)
	const miningPower = emissionPower('mining');
	const dscContGain = matchedFilterGain(dsc, 'continuous');
	const durations = [0.5, 1, 2, 4, 6, 8, 12, 24];

	scenarios.push({
		name: 'DSC watching miner — tier progression',
		description: 'How information quality improves with observation time.',
		input: {
			sensor: 'dsc',
			target: 'mining',
			noise: r(noise),
		},
		output: Object.fromEntries(durations.map(h => {
			const conf = passiveDetection(miningPower, noise, dsc.passive, hours(h), samplePeriod, dscContGain, 0);
			return [`${h}hr`, { confidence: r(conf), tier: informationTier(conf) }];
		})),
	});

	// Tier for various emissions at fixed time (VRS, 6hr)
	const emissionTypes = ['pnp_scan', 'drive_spool', 'mining', 'shield_regen'] as const;
	for (const type of emissionTypes) {
		const power = emissionPower(type);
		const profile = DEFAULT_EMISSION_PROFILES[type];
		const gain = matchedFilterGain(vrs, profile.spectralType);
		const conf = passiveDetection(power, noise, vrs.passive, hours(6), samplePeriod, gain, 0);
		scenarios.push({
			name: `VRS 6hr: ${type}`,
			description: `What can VRS learn about ${type} after 6 hours?`,
			input: { sensor: 'vrs', target: type, integrationHours: 6, power },
			output: { confidence: r(conf), tier: informationTier(conf) },
		});
	}

	// Equipment bonus comparison
	const baseThresholds = DEFAULT_TIER_THRESHOLDS;
	const correlatorThresholds = adjustedThresholds(baseThresholds, 0.05);
	const veteranThresholds = adjustedThresholds(baseThresholds, 0.05, 0.03);

	scenarios.push({
		name: 'Equipment/experience threshold shifts',
		description: 'How correlator modules and veteran bonuses shift information tiers.',
		input: {
			baseThresholds,
			correlatorBonus: 0.05,
			experienceBonus: 0.03,
		},
		output: {
			base: baseThresholds,
			withCorrelator: correlatorThresholds,
			withCorrelatorAndExperience: veteranThresholds,
		},
	});

	return {
		category: 'Information Tiers',
		description:
			'Confidence maps to information quality: anomaly → class → type → analysis. Equipment and experience shift thresholds down.',
		scenarios,
	};
}

// ── Main ─────────────────────────────────────────────────────

export function dsp(): void {
	const analysis: DSPAnalysis = {
		generated: new Date().toISOString(),
		constants: DEFAULT_DSP_CONSTANTS,
		emissionProfiles: DEFAULT_EMISSION_PROFILES,
		sensorAffinities: SENSOR_AFFINITIES,
		categories: [
			emissionProfiles(),
			stellarNoiseCategory(),
			noiseFloorComposition(),
			snrScenarios(),
			detectionCurves(),
			activeScanAccumulation(),
			passiveIntegration(),
			sensorComparison(),
			minerInBelt(),
			driveEnvelopeShapes(),
			envelopeDetectionTimeline(),
			signaturePowerEstimation(),
			driveClassification(),
			informationTierScenarios(),
		],
	};

	console.log(JSON.stringify(analysis, null, 2)); // eslint-disable-line no-console
}
