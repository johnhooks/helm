import type { Product } from '@helm/types';
import type { Constants } from './types';

export function strainFactor(distance: number, comfortRange: number): number {
	if (comfortRange <= 0) {
		return Infinity;
	}
	if (distance <= comfortRange) {
		return 1.0;
	}
	return 1 + (distance / comfortRange - 1) ** 2;
}

export function jumpComfortRange(
	drive: Product,
	coreOutputValue: number,
	perfRatioValue: number
): number {
	return (drive.sustain ?? 0) * coreOutputValue * perfRatioValue;
}

export function jumpDuration(
	distance: number,
	drive: Product,
	coreOutputValue: number,
	perfRatioValue: number,
	throttle: number,
	constants: Constants
): number {
	const amplitude = (drive.mult_c ?? 0) * coreOutputValue * perfRatioValue;
	const effectiveAmplitude = amplitude * throttle;
	if (effectiveAmplitude <= 0) {
		return Infinity;
	}
	return Math.ceil(
		(distance * constants.baseJumpSecondsPerLy) / effectiveAmplitude
	);
}

export function jumpCoreCost(
	distance: number,
	core: Product,
	drive: Product,
	throttle: number,
	comfortRange: number
): number {
	if (throttle <= 0.5) {
		return 0;
	}
	const strain = strainFactor(distance, comfortRange);
	return (
		distance * (core.mult_b ?? 0) * (drive.mult_b ?? 0) * throttle * strain
	);
}

export function jumpPowerCost(
	distance: number,
	constants: Constants,
	comfortRange: number
): number {
	const strain = strainFactor(distance, comfortRange);
	return distance * constants.baseJumpPowerPerLy * strain;
}
