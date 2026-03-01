/**
 * Emission formulas — how loud is each ship action?
 *
 * Every ship action produces electromagnetic emissions. A PNP scan floods
 * the system with broadband pulses. A miner's extraction laser hums at a
 * steady, moderate level. An idle ship emits nothing.
 *
 * These emissions are the *source signals* in the DSP pipeline. They feed
 * into the noise floor (as contributions from other ships) and into the
 * SNR calculation (as the target signal a detector is trying to resolve).
 *
 * Emission power is determined by two things:
 * 1. The action type — each has a base emission profile (see DEFAULT_EMISSION_PROFILES)
 * 2. The tuning value — effort/throttle/priority modify the base. Higher effort
 *    means more sweeps means louder. Higher throttle means hotter drive.
 */

import type { EmissionType, EmissionProfile } from './types';
import { DEFAULT_EMISSION_PROFILES } from './types';

/**
 * Base emission strength for an action type.
 *
 * Looks up the emission profile for the given type and returns its base
 * power. An optional componentStat multiplier scales the result — a Mk II
 * sensor might have a 1.2x emission multiplier because it's a more
 * powerful transmitter.
 *
 * @param emissionType - The action producing emissions
 * @param componentStat - Multiplier from the component performing the action (default 1.0)
 * @param profiles - Emission profile table (defaults to the design doc values)
 */
export function emissionPower(
	emissionType: EmissionType,
	componentStat: number = 1.0,
	profiles: Record<EmissionType, EmissionProfile> = DEFAULT_EMISSION_PROFILES,
): number {
	const profile = profiles[emissionType];
	return profile.base * componentStat;
}

/**
 * Emission modified by effort/throttle/priority.
 *
 * The tuning value represents how hard the component is working:
 * - For scans: effort → more sweeps → louder (tuning = effort)
 * - For drives: throttle → hotter burn → louder (tuning = throttle)
 * - For shields: priority → more regen → slightly louder (tuning = priority)
 *
 * The relationship is linear — twice the effort produces twice the emissions.
 * This is intentional: the loudness cost of working harder is proportional.
 * A wolf running effort 2.0 PNP scans is twice as easy to detect passively.
 *
 * @param baseEmission - Result of emissionPower()
 * @param tuningValue - Effort, throttle, or priority (default 1.0)
 */
export function tunedEmission(baseEmission: number, tuningValue: number = 1.0): number {
	return baseEmission * tuningValue;
}
