export interface ActionTuning {
	effort: number;
	throttle: number;
	priority: number;
}

export const DEFAULT_TUNING: ActionTuning = {
	effort: 1.0,
	throttle: 1.0,
	priority: 1.0,
};

export interface Constants {
	baseScanPowerPerLy: number;
	baseScanSecondsPerLy: number;
	baseJumpSecondsPerLy: number;
	baseJumpPowerPerLy: number;
	hopDecayFactor: number;
}

export const DEFAULT_CONSTANTS: Constants = {
	baseScanPowerPerLy: 2.0,
	baseScanSecondsPerLy: 30,
	baseJumpSecondsPerLy: 3600,
	baseJumpPowerPerLy: 8.0,
	hopDecayFactor: 0.9,
};
