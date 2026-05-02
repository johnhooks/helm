/**
 * Weapon formulas — phasers, torpedoes, PDS, ECM, shields.
 *
 * Based on docs/dev/weapons.md design.
 */

// ── Phaser ──────────────────────────────────────────────────

/**
 * Phaser power draw, factoring in hull weapon draw bonus.
 * Striker hull (0.6× mult) makes dual phasers viable.
 */
export function phaserDraw(baseDraw: number, weaponDrawMult: number): number {
	return baseDraw * weaponDrawMult;
}

/**
 * Phaser shield drain rate per hour, scaled by priority.
 * Higher priority = faster drain but more power cost.
 */
export function phaserShieldDrain(
	baseDrainRate: number,
	priority: number
): number {
	return baseDrainRate * priority;
}

/**
 * Phaser hull damage rate when hitting bare hull (no shields).
 * Shields dissipate phaser energy; bare hull takes full thermal impact.
 * Returns damage per hour against hull.
 */
export function phaserHullDamage(
	baseDrainRate: number,
	priority: number,
	hullDamageMult: number
): number {
	return phaserShieldDrain(baseDrainRate, priority) * hullDamageMult;
}

// ── Torpedo ─────────────────────────────────────────────────

/**
 * Torpedo hit chance after ECM and PDS reduction.
 *
 * @param baseAccuracy - launcher base accuracy (0-1), improved by experience
 * @param ecmReduction - target ECM degradation (0-1, 0 = no ECM)
 * @param pdsChance - PDS interception probability (0-1, 0 = no PDS)
 * @returns probability of torpedo hitting (0-1)
 */
export function torpedoHitChance(
	baseAccuracy: number,
	ecmReduction: number,
	pdsChance: number
): number {
	const afterEcm = baseAccuracy * (1 - ecmReduction);
	const afterPds = afterEcm * (1 - pdsChance);
	return Math.max(0, Math.min(1, afterPds));
}

/**
 * Torpedo damage on hit.
 * Payload is the raw damage value from the product's mult_a field.
 */
export function torpedoDamage(payload: number): number {
	return payload;
}

// ── PDS ─────────────────────────────────────────────────────

/**
 * PDS interception probability against incoming torpedoes.
 * Multiple torpedoes reduce per-torpedo interception (saturation).
 *
 * @param baseChance - PDS base intercept rate (0-1)
 * @param torpedoCount - number of incoming torpedoes in this volley
 * @returns per-torpedo interception probability
 */
export function pdsInterception(
	baseChance: number,
	torpedoCount: number
): number {
	if (torpedoCount <= 0) {
		return 0;
	}
	// Diminishing returns: effectiveness drops with more incoming
	const saturation = 1 / Math.sqrt(torpedoCount);
	return Math.max(0, Math.min(1, baseChance * saturation));
}

// ── ECM ─────────────────────────────────────────────────────

/**
 * ECM lock degradation — reduces attacker's sensor lock quality.
 * Affects both phaser drain efficiency and torpedo accuracy.
 *
 * @param ecmStrength - ECM module strength (product mult_a)
 * @returns reduction factor (0-1) applied to attacker accuracy/drain
 */
export function ecmLockDegradation(ecmStrength: number): number {
	return Math.max(0, Math.min(1, ecmStrength));
}

// ── Shield absorption ───────────────────────────────────────

/**
 * How damage splits between shield and hull.
 * Shields absorb damage first; overflow goes to hull.
 *
 * @param damage - incoming damage amount
 * @param currentShield - current shield HP
 * @returns shield damage and hull damage breakdown
 */
export function shieldAbsorption(
	damage: number,
	currentShield: number
): { shieldDamage: number; hullDamage: number } {
	const shieldDamage = Math.min(damage, currentShield);
	const hullDamage = Math.max(0, damage - currentShield);
	return { shieldDamage, hullDamage };
}
