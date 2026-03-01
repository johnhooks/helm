/**
 * Information classification — what does confidence reveal?
 *
 * Detection confidence maps to what the sensor can actually tell the player.
 * Low confidence means you know *something* is there. High confidence means
 * you know exactly what it is, what phase it's in, and its power output.
 *
 * Four tiers of information, each requiring more confidence than the last:
 *
 * | Tier     | Threshold | What You Learn                                  |
 * |----------|-----------|------------------------------------------------|
 * | anomaly  | 0.15      | "EM activity detected, bearing 040"            |
 * | class    | 0.40      | "continuous emission — likely mining/industrial"|
 * | type     | 0.65      | "signature consistent with DR-305 class drive" |
 * | analysis | 0.85      | "DR-305, spool phase, estimated power 1.2"     |
 *
 * Equipment bonuses (correlator modules, amplifiers) and experience bonuses
 * (veteran sensors, component drift) shift thresholds down — making it
 * easier to reach higher tiers at the same confidence level.
 */

import type { InformationTier, TierThresholds } from './types';
import { DEFAULT_TIER_THRESHOLDS } from './types';

/**
 * What information tier does this confidence level reach?
 *
 * Returns the highest tier the confidence qualifies for, or null if
 * the confidence is below even the anomaly threshold.
 *
 * @param confidence - Detection confidence (0-1)
 * @param thresholds - Tier thresholds (default from DSP constants)
 */
export function informationTier(
	confidence: number,
	thresholds: TierThresholds = DEFAULT_TIER_THRESHOLDS,
): InformationTier | null {
	if (confidence >= thresholds.analysis) {return 'analysis';}
	if (confidence >= thresholds.type) {return 'type';}
	if (confidence >= thresholds.class) {return 'class';}
	if (confidence >= thresholds.anomaly) {return 'anomaly';}
	return null;
}

/**
 * Shift tier thresholds down with equipment and pilot experience.
 *
 * Both bonuses are subtractive — a correlator module with bonus 0.05
 * shifts anomaly from 0.15 → 0.10. A veteran pilot with experience
 * bonus 0.03 stacks: 0.10 → 0.07. Thresholds are clamped to [0, 1].
 *
 * Experience sources (both feed experienceBonus):
 * - Pilot skill: permanent, on the WP user. "I've seen thousands of
 *   mining signatures." Survives ship loss.
 * - Component drift: on the hardware, dies with ship. "This sensor
 *   is tuned to continuous signals." Affects matchedFilterGain instead,
 *   but a portion could also shift tiers.
 *
 * @param base - Base tier thresholds (default from DSP constants)
 * @param equipmentBonus - Threshold reduction from installed equipment (default 0)
 * @param experienceBonus - Threshold reduction from pilot skill (default 0)
 */
export function adjustedThresholds(
	base: TierThresholds = DEFAULT_TIER_THRESHOLDS,
	equipmentBonus: number = 0,
	experienceBonus: number = 0,
): TierThresholds {
	const totalBonus = equipmentBonus + experienceBonus;
	return {
		anomaly: Math.max(0, Math.min(1, base.anomaly - totalBonus)),
		class: Math.max(0, Math.min(1, base.class - totalBonus)),
		type: Math.max(0, Math.min(1, base.type - totalBonus)),
		analysis: Math.max(0, Math.min(1, base.analysis - totalBonus)),
	};
}
