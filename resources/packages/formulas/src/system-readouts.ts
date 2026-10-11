import type { SystemStats } from '@helm/types';

/**
 * Effective system readouts matching PHP Power, Propulsion, and Sensors.
 * Navigation speed input is the drive's unscaled light-years per day.
 */
export function calculateSystemReadouts(stats: SystemStats, mode: string) {
	const modeOutput =
		{ efficiency: 0.7, normal: 1, overdrive: 1.3 }[mode] ?? 1;
	const output = stats.engineering.outputMult * modeOutput;
	const performance =
		stats.navigation.draw > 0
			? Math.min(1, output / stats.navigation.draw)
			: 1;
	return {
		output,
		driveRange: stats.navigation.range * output * performance,
		speed: stats.navigation.speed * output * performance,
		sensorRange: stats.sensors.range * output,
	};
}
