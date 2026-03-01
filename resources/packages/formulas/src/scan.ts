import type { Product } from '@helm/types';
import type { Constants } from './types';
import { strainFactor } from './jump';

export function scanComfortRange(sensor: Product, coreOutputValue: number): number {
	return (sensor.sustain ?? 0) * coreOutputValue;
}

export function scanPowerCost(distance: number, constants: Constants, comfortRange: number): number {
	const strain = strainFactor(distance, comfortRange);
	return distance * constants.baseScanPowerPerLy * strain;
}

export function scanDuration(distance: number, sensor: Product, effort: number, constants: Constants): number {
	return Math.ceil(distance * constants.baseScanSecondsPerLy * (sensor.mult_a ?? 0) * effort);
}

export function scanSuccessChance(
	sensor: Product,
	distance: number,
	comfortRange: number,
	effort: number,
	pilotSkill = 1.0,
): number {
	const base = sensor.chance ?? 0;
	const strain = strainFactor(distance, comfortRange);
	return Math.min(base * pilotSkill, (base / strain) * effort * pilotSkill);
}
