/**
 * Transit Shield Harmonics — shields regenerate at a fraction of normal rate during jump transit.
 */
export function transitShieldRegenRate(shieldRegenRate: number, magnitude: number): number {
	return shieldRegenRate * magnitude;
}

/**
 * HP recovered during a single jump transit phase.
 */
export function transitShieldRecovered(shieldRegenRate: number, transitSeconds: number, magnitude: number): number {
	return transitShieldRegenRate(shieldRegenRate, magnitude) * (transitSeconds / 3600);
}

/**
 * Core Resonance Scanning — scan power cost is drawn from core HP instead of capacitor.
 * Magnitude controls the split: 1.0 = all cost becomes core damage, 0.5 = half and half.
 * Clamped to [0, 1].
 */
export function coreResonanceCost(
	scanPowerCost: number,
	magnitude: number,
): { capacitorCost: number; coreDamage: number } {
	const clamped = Math.max(0, Math.min(1, magnitude));
	return {
		capacitorCost: scanPowerCost * (1 - clamped),
		coreDamage: scanPowerCost * clamped,
	};
}

/**
 * Sensor-Shield Coupling — passive sensor affinity multiplied while shields are active.
 */
export function sensorShieldCouplingMultiplier(magnitude: number): number {
	return 1 + magnitude;
}
