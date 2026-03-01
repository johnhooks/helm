export const PowerMode = {
	Efficiency: 'efficiency',
	Normal: 'normal',
	Overdrive: 'overdrive',
} as const;

export type PowerMode = (typeof PowerMode)[keyof typeof PowerMode];

export interface PowerModeProfile {
	readonly output: number;
	readonly decay: number;
	readonly regen: number;
}

export const POWER_MODE_PROFILES: Record<PowerMode, PowerModeProfile> = {
	efficiency: { output: 0.7, decay: 0.0, regen: 0.5 },
	normal: { output: 1.0, decay: 1.0, regen: 1.0 },
	overdrive: { output: 1.3, decay: 2.5, regen: 1.3 },
};
