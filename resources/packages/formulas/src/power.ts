import type { Product } from '@helm/types';

export function coreOutput(core: Product): number {
	return core.mult_a ?? 0;
}

export function regenRate(core: Product): number {
	return core.rate ?? 0;
}

export function perfRatio(coreOutputValue: number, drive: Product): number {
	const consumption = drive.mult_b ?? 0;
	if (consumption <= 0) {
		return 1;
	}
	return Math.min(1.0, coreOutputValue / consumption);
}

/**
 * Capacitor size derived from core capacity field.
 * Determines the maximum stored power available for actions.
 */
export function capacitor(core: Product): number {
	return core.capacity ?? 100;
}
