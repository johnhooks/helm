export interface ScanCalculationInputs {
	navigation_efficiency: number;
	base_sensor_range: number;
	core_output: number;
	sensor_quality: number;
	work_gain: number;
	remaining_distance: number;
	required_work: number;
	accumulated_work: number;
	power_mode: string;
	intensity: string;
}

/**
 * Mirrors ScanRoute\Rules::estimate; shared fixtures verify both implementations.
 */
export function calculateRouteStats(inputs: ScanCalculationInputs) {
	const output =
		{ efficiency: 0.7, normal: 1, overdrive: 1.3 }[inputs.power_mode] ?? 1;
	const speed = { economy: 0.5, normal: 1, fast: 2 }[inputs.intensity] ?? 1;
	const seconds = Math.ceil(
		210 / Math.max(0.1, inputs.navigation_efficiency) / speed / output
	);
	const range = inputs.base_sensor_range * inputs.core_output * output;
	const ratio = Math.min(1, inputs.remaining_distance / Math.max(0.1, range));
	const chance = Math.min(
		0.95,
		0.65 + 0.2 * (1 - ratio) + 0.1 * inputs.sensor_quality
	);
	const cycles = Math.ceil(
		Math.max(0, inputs.required_work - inputs.accumulated_work) /
			Math.max(0.001, inputs.work_gain * chance)
	);
	return {
		cycle_seconds: seconds,
		power_cost: speed * output ** 2,
		work_chance: chance,
		estimated_peak_seconds: cycles * seconds,
	};
}
